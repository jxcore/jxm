/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

package jxm;

import com.google.gson.Gson;
import com.google.gson.internal.LinkedTreeMap;

import javax.crypto.*;
import javax.crypto.spec.*;
import java.security.*;

import java.lang.reflect.Method;
import java.util.*;

/**
 * jxm.io Java Client
 */
public class Client {

    private class Disconnector extends Thread {
        Client dc;

        public Disconnector(Client c) {
            super(c.clientId + "-Disconnect");
            dc = c;
        }

        @Override
        public void run() {
            try {
                Thread.sleep(1);
            } catch (Exception e) {

            }
            if (dc.Events != null)
                dc.Events.OnClose(dc);
        }
    }

    private String applicationPath = "";

    private Object classToCall;

    private String clientId = null;

    boolean closed = false;

    private boolean encrypted = false;

    /**
     * The ClientEvents object for listening of client's events.
     * @custom.example
     * <pre>
     * [code language="java" smarttabs="true"]
     * jxm.ClientEvents events = new ClientEvents(){
     *     &#64;Override public void OnErrorReceived(Client c, String Message) {
     *         //Error received
     *     }
     *     &#64;Override public void OnClientConnected(Client c) {
     *         //Client is connected
     *     }
     *     &#64;Override public void OnClientDisconnected(Client c) {
     *         //Client is disconnected
     *     }
     *     &#64;Override public void OnEventLog(Client c, String log, LogLevel level) {
     *         //get the event log from here
     *     }
     * };
     * //now we may define this listener into our Client instance
     * client.Events = event;
     * [/code]
     * </pre>
     */
    public ClientEvents Events = null;

    private boolean isConnected = false;
    private boolean isListenerActive = false;
    private boolean isSecure = false;

    private PListen listener = null;
    private HashMap<String, Method> methodsOfCall = new HashMap<String, Method>();

    private PListen send = null;
    private int socketPort = 8000;

    private String socketURL = null;

    @SuppressWarnings("rawtypes")
    private Class typeToCall;

    /**
     * Creates an instance of JXCore Java Client.
     *
     * @param localTarget The local object will be answering the calls from server. i.e new Test()
     * @param appName     Application Name
     * @param appKey      Secure Application Key
     * @param url         JXcore server URL  i.e. sampledomain.com or 120.1.2.3
     * @param port        Server port
     * @param secure      Server SSL support
     *
     * @custom.example
     * <pre>
     * [code language="java" smarttabs="true"]
     * // let's create a client instance
     * Client client = new Client(new CustomMethods(), "channels",
     *     "NUBISA-STANDARD-KEY-CHANGE-THIS", "localhost", 8000, false);
     * [/code]
     * </pre>
     */
    public Client(Object localTarget, String appName, String appKey, String url, int port, boolean secure) {
        socketURL = url;
        socketPort = port;
        isSecure = secure;
        applicationPath = appName;
        applicationKey = PListen.getUID(false) + "|" + appName;
        setSecureKey(appKey);
        this.classToCall = localTarget;

        if (localTarget != null && CustomMethodsBase.class.isAssignableFrom(localTarget.getClass())) {
            ((CustomMethodsBase)localTarget).SetClient(this);
        }
    }

    /**
     * Creates an instance of JXcore Java Client.
     *
     * @param localTarget The local object will be answering the calls from server. i.e new Test()
     * @param appName     Application Name
     * @param appKey      Secure Application Key
     * @param url         JXcore server URL  i.e. sampledomain.com or 120.1.2.3
     * @param port        Server port
     * @param secure      Server SSL support
     * @param resetUID    Reset the unique instance id (session id)
     * @custom.example
     * <pre>
     * [code language="java" smarttabs="true"]
     * // let's create a client instance
     * Client client = new Client(new CustomMethods(), "channels",
     *     "NUBISA-STANDARD-KEY-CHANGE-THIS", "localhost", 8000, false, true);
     * [/code]
     * </pre>
     */
    public Client(Object localTarget, String appName, String appKey, String url, int port, boolean secure, boolean resetUID) {
        socketURL = url;
        socketPort = port;
        isSecure = secure;
        applicationPath = appName;
        applicationKey = PListen.getUID(resetUID) + "|" + appName;
        setSecureKey(appKey);
        this.classToCall = localTarget;

        if (localTarget != null && CustomMethodsBase.class.isAssignableFrom(localTarget.getClass())) {
            ((CustomMethodsBase)localTarget).SetClient(this);
        }
    }

    private String applicationKey;
    private String securedKey = null;

    private void setSecureKey(String key){
        securedKey = encrypt(key, applicationKey);
    }

    public String encrypt(String key, String message){
        try{
            byte[] input = message.toString().getBytes("utf-8");
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] thedigest = md.digest(key.getBytes("UTF-8"));
            SecretKeySpec skc = new SecretKeySpec(thedigest, "AES");
            Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
            cipher.init(Cipher.ENCRYPT_MODE, skc);
            byte[] cipherText = new byte[cipher.getOutputSize(input.length)];
            int ctLength = cipher.update(input, 0, input.length, cipherText, 0);
            ctLength += cipher.doFinal(cipherText, ctLength);
            String str = Base64.encode(cipherText);

            str = PListen.escape( str ).replace("+", "**43;");

            return str;
        }catch(Exception e){
            if(Events!=null){Events.OnError(this, e.getMessage());}
            return null;
        }
    }

    /**
     * Establishes the connection on a separate thread.
     */
    public void AsyncConnect() {
        Thread thread = new Thread() {
            @Override
            public void run() {
                Connect();
            }
        };

        thread.start();
    }

    /**
     * Closes Client and disconnects from server.
     */
    public void Close() {
        goClose();
    }

    /**
     * Closes Client and disconnects from server.
     */
    public void goClose() {
        if (closed)
            return;
        closed = true;

        fireLog("Closing connection", LogLevel.Informative);
        if (this.getIsConnected()) {

            listener.Dispose();
            send.exit = true;

            this.isConnected = false;

            if (Events != null) {
                new Disconnector(this).start();
            }
        }
    }

    /**
     * Subscribes the client to a group, or channel. From now on, messages sent to that group
     * by any other subscriber will be received by the client.
     * Also the client himself can send messages to this group - see jxcore.SendToGroup() method.
     * @param group     Name of the group, to which the client is subscribing.
     * @param cb        This is client's callback, which will be called after server will subscribe the client to the group.
     * @throws Exception
     * @custom.example
     * <pre>
     * [code language="java" smarttabs="true"]
     * try {
     *      client.Subscribe("programmers", new Callback() {
     *          &#64;Override
     *          public void call(Object o) throws Exception {
     *              System.out.println("Subscribed to " + o.toString());
     *              client.SendToGroup("programmers", "clientMethod",
     *              "Hello from client!");
     *          }
     *      });
     * } catch (Exception e) {
     *      System.out.println("Cannot subscribe.");
     * }
     * [/code]
     * </pre>
     */
	public void Subscribe(final String group, final Callback cb) throws Exception {
		if (group != null) {
			Map<String, Object> map = new HashMap<String, Object>();
			map.put("gr", group);
			map.put("en", enc);

			this.Call("nb.ssTo", map, new Callback() {
				@Override
				public void call(Object o, Integer err) throws Exception {
					JSON js = (JSON) o;
					if (err == 0) {
						onSub(js.getValue("key").toString());
						lastMessId = js.getValue("did").toString();
					}

					if (cb != null) {
						cb.call(group, err);
					}
				}
			});
		} else {
			Integer errCode = 6; /* must be non-empty string */
			if (cb != null) {
				cb.call(group, errCode);
			} else {
				throw new Exception("Error no " + errCode);
			}
		}
	}

    private void onSub(String en){
        enc = en;
    }

    private String enc = null;

    /**
     * Unsubscribes the client from a group, or channel. From now on, messages sent to that group cannot be received by this client.
     * @param group {string} - Name of the group, from which the client is unsubscribing.
     * @param cb {function} - This is client's callback, which will be called after server will unsubscribe the client to the group.
     * @throws Exception
     * @custom.example
     * <pre>
     * [code language="java" smarttabs="true"]
     * try {
     *      client.Unubscribe("programmers", new Callback() {
     *          &#64;Override
     *          public void call(Object o) throws Exception {
     *              System.out.println("Unubscribed from " + o.toString());
     *          }
     *      });
     * } catch (Exception e) {
     *      System.out.println("Cannot unubscribe.");
     * }
     * [/code]
     * </pre>
     */
	public void Unsubscribe(final String group, final Callback cb) throws Exception {
		if (enc == null) {
			return;
		}

		if (group != null) {
			Map<String, Object> map = new HashMap<String, Object>();
			map.put("gr", group);
			map.put("en", enc);

			this.Call("nb.unTo", map, new Callback() {
				@Override
				public void call(Object o, Integer err) throws Exception {
					JSON js = (JSON) o;
					if (err == 0) {
						onSub(js.getValue("key").toString());
					}

					if (cb != null) {
						cb.call(group, err);
					}
				}
			});
		} else {
			Integer errCode = 6; /* must be non-empty string */
			if (cb != null) {
				cb.call(group, errCode);
			} else {
				throw new Exception("Error no " + errCode);
			}
		}
	}

    /**
     * Sends message to all clients, that have already subscribed to the specific group.
     * @param groupName  {string} - Name of the group, to which message should be sent.
     * @param methodName {string} - Client's custom method, which should be invoked of each of the group subscribers.
     * @param params {object} - The argument for that method.
     * @custom.example
     * <pre>
     * [code language="java" smarttabs="true"]
     * // The "addText" method should be available on every client, which is subscribed to
     * // "programmers" group.
     * // While invoking the "addText" method at each client, the server will pass
     * // "Hello from client!" string as an argument.
     * cli.SendToGroup("programmers", "addText", "Hello from client!");
     * [/code]
     * </pre>
     */
    public void SendToGroup(String groupName, String methodName, Object params, Callback cb){
        Map<String, Object> map = new HashMap<String, Object>();
        map.put("gr", groupName);
        map.put("m", methodName);
        map.put("j", params);
        map.put("key", enc);
        
        this.Call("nb.stGr", map, cb);    
    }

    /**
     * Starts the client. Connects to the server.
     * @return true/false based on the result.
     * @custom.example
     * <pre>
     * [code language="java" smarttabs="true"]
     * // we will try to connect now
     * if (client.Connect()) {
     *     System.out.println("ready!");
     * }
     * [/code]
     * </pre>
     */
    public boolean Connect() {
        if (isConnected) {
            errorMessage("JXcore Client is already connected.");
            return false;
        }

        if (closed) {
            errorMessage("Once a Client is disconnected you may not use the same instance to reconnect back.");
            return false;
        }

        fireLog("Connecting to server", LogLevel.Informative);

        this.Initialize();

        if(getSecuredKey() == null)
            return false;

        String connStr = socketURL.concat(":" + socketPort + "/" + applicationPath + "/jx?ms=connect&de=1&sid=" + getSecuredKey() + "&a");
        if(!connStr.startsWith("http")) {
            if (isSecure) {
                connStr = "https://" + connStr;
            } else {
                connStr = "http://" + connStr;
            }
        }else{
            if(connStr.startsWith("https"))
                isSecure = true;
            else
                isSecure = false;
        }

        String str = send.downloadString(connStr);
        boolean end = false;

        if (str != null && str != "") {
            String [] arr = str.split("\\|");
            if(arr.length<2){
                end = true;
            }else{
                clientId = arr[0];

                try {
                    encrypted = Boolean.parseBoolean(arr[1]);
                } catch (Exception e) {
                    errorMessage("Couldn't connect to server. more:" + e.getMessage());
                    return false;
                }

                isConnected = true;
            }
        }
        else end = true;

        if(end){
            errorMessage("Couldn't connect to server. Check URL for service.");
            return false;
        }
        fireLog("Connection script parsed. Starting to listen.", LogLevel.Informative);

        // let listener start before OnClientConnected
        boolean ret = Listen();

//        if(Events!=null){
//            Events.OnClientConnected(this);
//        }

        return ret;
    }

    public boolean getIsSecure(){
        return isSecure;
    }

    private void errorMessage(String message) {
        if (Events != null)
            Events.OnError(this, message);
    }

    public final class JSON
    {
        LinkedTreeMap<String, Object> obj = null;
        public JSON(String json, boolean isArray){
            try{
                if(!isArray){
                    obj = (LinkedTreeMap<String, Object>)aParser.fromJson(json, Object.class);
                }else{
                    array = aParser.fromJson(json, Object[].class);
                }

                initialized = true;
            }
            catch(Exception e){
                initialized = false;
                if(Events != null){
                    Events.OnError(null, e.getMessage());
                }
            }
        }

        private boolean initialized = false;
        public boolean isInitialized(){
            return initialized;
        }

        private JSON(LinkedTreeMap<String, Object> o){
            obj = o;
        }

        private Gson aParser = new Gson();
        private Object [] array = null;

        public void toArray(){
            if(obj==null)
                return;

            array = obj.values().toArray();
        }

        public int size(){
            if(array==null)
                return 0;

            return array.length;
        }

        public JSON getItem(int index){
            if(array==null)
                return null;

            return new JSON((LinkedTreeMap<String, Object>)array[index]);
        }

        public boolean containsKey(String key){
            if(obj==null)
                return false;

            return obj.containsKey(key);
        }

        public JSON getItem(String key){
            if(obj==null)
                return null;

            return new JSON((LinkedTreeMap<String, Object>)obj.get(key));
        }

        public boolean isKeyObject(String key){
            if(obj==null)
                return false;

            if(!obj.containsKey(key)){
                return false;
            }

            return obj.get(key) instanceof LinkedTreeMap;
        }

        public Object getValue(String key){
            if(obj == null)
                return null;

            return obj.get(key);
        }
    }

    private String lastMessId = null; 

    private void Eval(String msg)
    {
    	msg = msg.replace(":null", ":'null'");
        fireLog("evaluating message:" + msg, LogLevel.Informative);

        JSON json = new JSON("[" + msg + "]", true);

        int size = json.size();

        for(int i=0;i<size;i++){

            JSON js = json.getItem(i);

            if(js.containsKey("i")){
                Object oi = js.getValue("i");
                if(oi!=null){
                    lastMessId = oi.toString();
                }
            }

            if(js.containsKey("o")){
                js = js.getItem("o");

                String methodName = null;
                String strIndex = null;
                if(js.containsKey("m")){
                    methodName = js.getValue("m").toString();
                }
                else if(js.containsKey("i")){
                    strIndex = js.getValue("i").toString();
                }
                else
                    continue;

                Object param = null;
                if(js.containsKey("p")){
                    if(js.isKeyObject("p")){
                        param = js.getItem("p");
                    }else
                    {
                        param = js.getValue("p");
                    }
                }

                if(methodName != null && (methodName.contains("jxcore.Listen") || methodName.contains("jxcore.Close"))){
                    if(methodName.contains("jxcore.Close"))
                        this.goClose();
                }
                else if (strIndex!=null){
                    try{
                    	float fl = Float.valueOf(strIndex).floatValue();
                        int n = (int)fl;

                        if (n < 0) {
                            ssCall(n, param);
                        } else {
                        	Integer err = 0;
                        	
                        	if (JSON.class.isAssignableFrom(param.getClass())) {
                        		JSON p = (JSON)param;
                                
                            	Object nb_err = p.containsKey("nb_err") ? p.getValue("nb_err") : null;

                            	if (nb_err != null) {
                                	float fl1 = Float.valueOf(nb_err.toString()).floatValue();
                                    err = (int)fl1;
                            	}
                        	}
                        	
                            if(callbacks.size()>n-1) {                      	
                            	callbacks.get(n-1).call(param, err);
                            	callbacks.set(n-1, null);
                            }
                        }
                    }catch(Exception e){
                        errorMessage("CallbackInvoke at (" + strIndex + ") :" + e.getMessage());
                    }
                }
                else if (classToCall != null && methodsOfCall.containsKey(methodName)) {
                    try {
                        methodsOfCall.get(methodName).invoke(classToCall, param);
                    } catch (Exception e) {
                        errorMessage("MethodInvoke (" + methodName + ") :" + e.getMessage());
                    }
                } else {
                    fireLog("Method " + methodName + " wasn't exist on target object.", LogLevel.Critical);
                }
            }
        }
        json = null;
    }

    // server-side call
    private void ssCall(int id, Object param) {
        if (id==-1) {
            JSON js = (JSON)param;
            Object key = js.getValue("key");
            Object did = js.getValue("did");
            if (key != null) {
                onSub(key.toString());
            }
            if (did != null) {
                lastMessId = did.toString();
            }

            if (Events != null) {
                Events.OnSubscription(this,js.getValue("su").toString().toLowerCase() == "true", js.getValue("gr").toString());
            }
        }
    }

    /**
     * Fires log event
     *
     * @param log
     * @param level
     */
    public void fireLog(String log, LogLevel level) {
        if (Events != null) {
            Events.OnEventLog(this, log, level);
        }
    }

    /**
     * Gets unique id of the client.
     */
    public String GetClientId() {
        return clientId;
    }

    public boolean getEncrypted() {
        return encrypted;
    }

    public boolean getIsConnected() {
        return isConnected;
    }

    public int getSocketPort() {
        return socketPort;
    }

    public String getSocketURL() {
        return socketURL;
    }

    public String getApplicationPath(){
        return applicationPath;
    }

    private void Initialize() {
        fireLog("Initializing Client", LogLevel.Informative);
        listener = new PListen("listen", this);
        send = new PListen("send", this);
        final Client dc = this;
        listener.notifier = new PEvents() {
            @Override
            public void ErrorReceived(String message) {
                errorMessage(message);
            }

            @Override
            public void MessageReceived(String message) {
                messageReceived(message);
            }

            @Override
            public void UpdateIsConnected(boolean connected) {
                isConnected = connected;
                fireLog("Connection state is updated to " + connected, LogLevel.Informative);
                if (Events != null) {
                    if (connected)
                        Events.OnConnect(dc);
                    else {
                        if (!closed)
                            Events.OnClose(dc);
                    }
                }
            }
        };
        send.notifier = listener.notifier;
        isListenerActive = false;
        if (classToCall != null) {
            typeToCall = classToCall.getClass();
            Method[] methods = typeToCall.getMethods();
            int ln = methods.length;
            for (int i = 0; i < ln; i++) {
                Method method = methods[i];
                methodsOfCall.put(method.getName(), method);
            }
        }
    }

    private boolean Listen() {
        if (isListenerActive)
            return false;

        fireLog("Entering Listener Thread", LogLevel.Informative);

        isListenerActive = true;

        listener.start();

        return true;
    }

    private void messageReceived(String message) {
        Eval(message);
    }

    public String getSecuredKey(){
        return securedKey;
    }

    private String createJSON(String methodName, Object params, Callback callback){
        StringBuilder sb = new StringBuilder();
        sb.append("{");

        if(methodName != null){
            sb.append("\"m\":\"" + methodName + "\"");
        }

        if(params!=null){
            sb.append(",\"p\":" + new Gson().toJson(params));
        }

        if(callback!=null){
            callbacks.add(callback);
            sb.append(",\"i\":" + callbacks.size());
        }

        sb.append("}");

        return sb.toString();
    }

    static List<Callback> callbacks = new ArrayList<Callback>();

    /**
     * Invokes specific custom method defined on the server-side.
     * @param methodName    The name of custom method defined at the backend. It should contain also class definer name. i.e. MyClass.MyMethod.
     * @param params        The argument for that method.
     * @param callback      This is client's callback, which will be called after server completes invoking it's custom method. This parameter is optional.
     * @throws java.lang.UnsupportedOperationException
     * @custom.example
     * <pre>
     * [code language="java" smarttabs="true"]
     * // let's call the server-side method "serverMethod" from the client-side!
     * // in turn, as a response, the backend service will invoke
     * // client's local "callback" defined above!
     * client.Call("serverMethod", "Hello", callback);
     * [/code]
     * </pre>
     */
    public void Call(String methodName, Object params, Callback callback) throws java.lang.UnsupportedOperationException {
        if (!this.getIsConnected())
            return;

        String sb = createJSON(methodName, params, callback);

        if(getSecuredKey() == null)
            return;

        String connStr = socketURL.concat(":" + socketPort + "/" + applicationPath + "/jx?de=1&");
        if(isSecure){
            connStr = "https://" + connStr;
        }else{
            connStr = "http://" + connStr;
        }

        connStr = connStr.concat("c=" + clientId + "&sid="+securedKey+"&co=" + ((Long) (new Date().getTime())).toString());

        String mess = PListen.CreateText(this, sb, false);

        synchronized (sendList){
            sendList.add(new SendQueue(methodName, connStr, mess));
        }

        if(sendDone){
            sendDone = false;
            sendThread = new Thread() {
                @Override
                public void run() {
                    try{
                        while(true)
                        {
                            synchronized (sendList){
                                if(sendList.isEmpty()){
                                    sendDone = true;
                                    break;
                                }
                            }

                            sendFromQueue();
                        }
                    }finally{
                        sendDone = true;
                    }
                }
            };
            sendThread.start();
        }
    }

    Thread sendThread = null;
    boolean sendDone = true;

    private class SendQueue {
        public String methodName;
        public String connStr;
        public String mess;

        public SendQueue(String a, String b, String c) {
            methodName = a;
            connStr = b;
            mess = c;
        }
    }

    private Queue<SendQueue> sendList = new ArrayDeque<SendQueue>();

    private void sendFromQueue() {
        SendQueue q = null;

        synchronized (sendList){
            q = sendList.poll();
        }

        if(q==null){
            return;
        }

        String mess = q.mess;
        String connStr = q.connStr;
        String methodName = q.methodName;

        String result = null;
        if (!listener.socketEnabled()) {
            result = send.downloadString(connStr, "ms=" + mess);
        } else {
            listener.socketSend(mess);
        }

        if (result != null) {
            result = result.trim();

            fireLog(result + " received for methodCall " + methodName, LogLevel.Informative);
            if (result.startsWith("/**/")) {
                if (result.contains("jxcore.Closed()")) {
                    this.goClose();
                }
            } else
                Eval(result);
        }
    }
}
