/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */
package jxm;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.NoRouteToHostException;
import java.net.URI;
import java.net.URL;
import java.net.URLConnection;
import java.util.Date;


public class PListen extends Thread {

    public static final String ENCODING = "UTF8";

    public final static String CreateText(Client client, String mess, boolean in) {
        if (client.getEncrypted()) {
            if(in){
                mess = new String(Base64.decode(mess));
            }
        }

        if (in) {
            mess = unescape(mess);
            mess = mess.replace("\r", "\\r").replace("\n", "\\n");
        } else {
            mess = mess.replace("\r", "\\r").replace("\n", "\\n");
            mess = escape(mess);
        }

        if (client.getEncrypted()) {
            if(!in){
                mess = Base64.encode(mess.getBytes());
            }
        }

        return mess;
    }

    public static String escape(String str1) {
        final String str2 = "0123456789ABCDEF";
        final int length = str1.length();
        StringBuilder stringBuilder = new StringBuilder(length * 2);
        int index = -1;
        while (++index < length) {
            char ch = str1.charAt(index);
            int num = (int) ch;
            if ((97 > num || num > 122) && (65 > num || num > 90)
                    && ((48 > num || num > 57) && ((int) ch != 64 && (int) ch != 42))
                    && ((int) ch != 95 && (int) ch != 43 && ((int) ch != 45 && (int) ch != 46) && (int) ch != 47)) {
                stringBuilder.append('%');
                if (num < 256) {
                    stringBuilder.append(str2.charAt(num / 16));
                    ch = str2.charAt(num % 16);
                } else {
                    stringBuilder.append('u');
                    stringBuilder.append(str2.charAt((num >> 12) % 16));
                    stringBuilder.append(str2.charAt((num >> 8) % 16));
                    stringBuilder.append(str2.charAt((num >> 4) % 16));
                    ch = str2.charAt(num % 16);
                }
            }
            stringBuilder.append(ch);
        }
        return stringBuilder.toString();
    }

    private static int HexDigit(char c) {
        if ((int) c >= 48 && (int) c <= 57) return (int) c - 48;
        if ((int) c >= 65 && (int) c <= 70) return 10 + (int) c - 65;
        if ((int) c >= 97 && (int) c <= 102) return 10 + (int) c - 97;

        return -1;
    }

    public static String unescape(String str) {
        int length = str.length();
        StringBuilder stringBuilder = new StringBuilder(length);
        int index = -1;
        while (++index < length) {
            char ch = str.charAt(index);
            if ((int) ch == 37) {
                int num1;
                int num2;
                int num3;
                int num4;
                if (index + 5 < length && (int) str.charAt(index + 1) == 117
                        && ((num1 = HexDigit(str.charAt(index + 2))) != -1 && (num2 = HexDigit(str.charAt(index + 3))) != -1)
                        && ((num3 = HexDigit(str.charAt(index + 4))) != -1 && (num4 = HexDigit(str.charAt(index + 5))) != -1)) {
                    ch = (char) ((num1 << 12) + (num2 << 8) + (num3 << 4) + num4);
                    index += 5;
                } else {
                    int num5;
                    int num6;
                    if (index + 2 < length && (num5 = HexDigit(str.charAt(index + 1))) != -1
                            && (num6 = HexDigit(str.charAt(index + 2))) != -1) {
                        ch = (char) ((num5 << 4) + num6);
                        index += 2;
                    }
                }
            }
            stringBuilder.append(ch);
        }
        return stringBuilder.toString();
    }

    private InputStream activeStream = null;

    private Client client;

    private String errorMessage = "";

    public boolean exit = false;

    private boolean isDisposing = false;

    public PEvents notifier = null;

    private Socketer socketConn = null;

    private boolean socketConnected = false;
    private boolean socketConnecting = false;

    public boolean socketDisabled = false;

    public PListen(final String name, final Client pClient) {
        super(pClient.GetClientId() + name);
        client = pClient;
    }

    public void Dispose() {
        client.fireLog("Disposing Listener", LogLevel.Critical);
        exit = true;
        if (socketConnected || socketConnecting) {
            try {
                socketConn.close();
            } catch (Exception e) {
            }
        }
        socketConnected = false;
        socketDisabled = false;
        socketConnecting = false;
        isDisposing = true;
        try {
            activeStream.close();
        } catch (Exception e) {
        }
    }

    public String downloadString(final String connStr) {
        InputStream stream = null;
        try {
            URL url = new URL(connStr);
            stream = url.openStream();
            activeStream = stream;
        } catch (Exception e) {
            errorMessage = e.getClass().getName() + " : " + e.getMessage();
            fire(null, true);
            client.goClose();
            return null;
        }


        InputStreamReader isr = new InputStreamReader(stream);
        BufferedReader rs = new BufferedReader(isr);
        StringBuilder str = new StringBuilder();

        try {
            String st;
            while ((st = rs.readLine()) != null) {
                byte[] data = st.getBytes();
                str.append(new String(data, 0, data.length, ENCODING));
            }
            stream.close();
        } catch (Exception ex) {
            if (isDisposing)
                return "";

            errorMessage = "Error during download:" + ex.getMessage();
            fire(null, true);
            return null;
        }

        return str.toString();
    }

    private static String uid = null;

    private static long uidc = 0;

    public static String getUID(boolean reset) {  //TODO: update here from server side
        if (uid == null || reset)
            uid = java.util.UUID.randomUUID().toString().replace("-","") + (uidc++);

        return uid;
    }

    public String downloadString(final String connStr, final String params) {
        URL url;
        URLConnection conn;
        try {
            url = new URL(connStr);
            conn = url.openConnection();

            conn.setDoOutput(true);

            OutputStreamWriter writer = new OutputStreamWriter(conn.getOutputStream());
            writer.write(params);
            writer.flush();

            InputStreamReader irs = new InputStreamReader(conn.getInputStream());
            BufferedReader in = new BufferedReader(irs);
            StringBuilder str = new StringBuilder();

            String st;
            while ((st = in.readLine()) != null) {
                byte[] data = st.getBytes();
                str.append(new String(data, 0, data.length, ENCODING));
            }

            writer.close();
            in.close();

            return str.toString();
        } catch (NoRouteToHostException ne) {
            errorMessage = "connection to host is lost";
            fire(null, true);
            notifier.UpdateIsConnected(false);
            return null;
        } catch (Exception e) {
            errorMessage = e.getClass().getName() + " : " + e.getMessage();
            fire(null, true);
            return null;
        }
    }

    private void fire(String msg, boolean isError) {
        if (notifier != null) {
            if (isError) {
                notifier.ErrorReceived(errorMessage);
            } else {
                notifier.MessageReceived(msg);
            }
        }
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public boolean getSocketConnected() {
        return socketConnected;
    }

    public void ListenSocket() throws Exception {
        if (socketConnected || socketConnecting)
            return;

        int port = client.getSocketPort();

        if(client.getSecuredKey() == null)
            return;

        String url = "ws://" + client.getSocketURL() + ":" + port + "/" + client.getApplicationPath()+ "/jx?c=" + client.GetClientId()
                +"&sid="+client.getSecuredKey()+"&de=1";

        URI uri = new URI(url);
        socketConn = new Socketer(uri);
        socketConnecting = true;

        socketConn.events = new SocketEvents() {
            @Override
            public void close() {
                socketConnected = false;
                socketConnecting = false;
                client.fireLog("Socket Closed", LogLevel.Critical);
                client.goClose();
            }

            @Override
            public void error(Exception e) {
                errorMessage = "SocketError:" + e.getMessage();
                fire(null, true);
                //client.Call("71n9", null, null);
            }

            @Override
            public void message(String message) {
                client.fireLog("Socket Received:" + message, LogLevel.Informative);
                message = PListen.CreateText(client, message, true);
                fire(message, false);
            }

            @Override
            public void open() {
                socketConnected = true;
                socketConnecting = false;
                client.fireLog("Socket Connected", LogLevel.Informative);
                if(client.Events!=null){
                    client.Events.OnConnect(client);
                }
            }
        };

        socketConn.connect();
    }

    public void Reload() {
        client.fireLog("Reloading Client (not suggested! instead recreate DesktopClient instance)", LogLevel.Critical);
        isDisposing = false;
    }

    @Override
    public void run() {

        isDisposing = false;
        exit = false;

        while (!exit) {
            try {
                Thread.sleep(25);
            } catch (Exception e) {
                break;
            }

            if (this.socketConnected || this.isDisposing) {
                continue;
            }

            boolean hasListen = false;

            if (client.getSocketURL() != null && !socketDisabled && !isDisposing) {
                hasListen = true;
            }
            else{
                String connStr = client.getSocketURL().concat(":" + client.getSocketPort() + "/" + client.getApplicationPath() + "/jx?");
                if(client.getIsSecure()){
                    connStr = "https://" + connStr;
                }else{
                    connStr = "http://" + connStr;
                }

                if(client.getSecuredKey() == null)
                    return;

                connStr = connStr.concat("c=" + client.GetClientId() + "&de=1&sid="+client.getSecuredKey()+"&co=" + ((Long) (new Date().getTime())).toString());
                //client.fireLog("HTTP DownloadStart "+connStr, LogLevel.Informative);
                String message = downloadString(connStr);
                //	client.fireLog("HTTP DownladEnd", LogLevel.Informative);
                if (message == null) {
                    continue;
                }

                client.fireLog("HTTP Received:" + message, LogLevel.Informative);
                if (isDisposing) {
                    continue;
                }

                if (!client.getIsConnected() && !isDisposing) {
                    continue;
                }

                String[] messages;
                if (client.getEncrypted()) {
                    messages = message.split(";");
                    final int ln = messages.length;
                    for (int i = 0; i < ln; i++) {
                        if (messages[i] != null) {
                            try {
                                messages[i] = PListen.CreateText(client, messages[i].trim(), true);
                            } catch (Exception e) {
                            }
                        }
                    }
                } else {
                    messages = new String[1];
                    try {
                        messages[0] = PListen.CreateText(client, message.trim(), true);
                    } catch (Exception e) {
                    }
                }

                for (String mess : messages) {
                    if (mess == null)
                        continue;

                    if (!hasListen) {
                        hasListen = mess.contains("jxcore.Listen");
                    }
                    fire(mess, false);
                }
            }

            if (hasListen) {
                if (client.getSocketURL() != null && !socketDisabled && !isDisposing) {
                    try {
                        if (!socketEnabled())
                            this.ListenSocket();
                    } catch (Exception e) {
                        socketDisabled = true;
                        errorMessage = "Socket Connection Error (" + e.getMessage() + ") Socket connection disabled.";
                        fire(null, true);
                    }
                }
                continue;
            } else {
                if (socketConnected || socketConnecting){}else{
                    notifier.UpdateIsConnected(false);
                    break;
                }
            }
        }
    }

    public boolean socketEnabled() {
        return (this.socketConnected);
    }

    public boolean socketSend(String msg) {
        if (socketConn == null)
            return false;
        try {
            socketConn.send(msg);
        } catch (Exception e) {
            errorMessage = "socketSend Error:" + e.getMessage();
            fire(null, true);
            return false;
        }

        return true;
    }
}
