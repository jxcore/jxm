/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

import jxm.*;

import javax.xml.bind.DatatypeConverter;
import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.concurrent.atomic.AtomicInteger;

public class socketTest {

    public static int total = 1;
    public static int port = 8000;
    public static String ip = "127.0.0.1";

    /**
     * @param args
     */
    public static void main(String[] args) throws Exception {

        if (args.length == 0) {
            System.out.println("Usage:java -jar jxm [numberOfClients] url/ip port");
            return;
        } else
            total = DatatypeConverter.parseInt(args[0]);

        if(args.length>1){
            ip = args[1];
        }

        if(args.length>2){
            port = DatatypeConverter.parseInt(args[2]);
        }

        System.out.println("Connecting to target " + ip + ":" + port);

        drawMenu();
        Test test = new Test();
        initClient(test);
        Client client = clients[0];

        for (int i = 1; i < total; i++)
            clients[i].Connect();

        if (clients[0].Connect()) {
            String code = "";
            System.out.println("ready!");

            while (!code.equalsIgnoreCase("q")) {

                if (code.length() > 0) {
                    if (code.equals("1")) {
                        callMethod1();
                    }
                }
                System.out.println(":");
                code = readMenuCode();
            }
            System.out.println("exiting application..");
            exitApp = true;
        }
    }

    static boolean exitApp = false;

    static String readMenuCode() throws Exception {
        int n = System.in.read();
        return new String(new char[]{(char) n});
    }

    static void drawMenu() {
        String menus[] = {
                "1 - Call Server.testCall",
                "q - Exit"
        };
        for (String m : menus)
            System.out.println(m);
    }

    static void callMethod1() {
        Test.counter = new AtomicInteger(0);
        Calendar now = GregorianCalendar.getInstance();
        System.out.println("Sending to "+total+" clients");
        long tm = now.getTimeInMillis();
        Test.timer = tm;


        for(int q=0;q<20;q++){
            for (int i = 0; i < total; i++)  {
                clients[i].Call("chatMessage", "Samples/test" + i + "-" + tm, null);
            }

            try{
                Thread.sleep(1000);   // for local tests 1 instead 1000
            }catch(Exception e){

            }
            System.out.println("ANOTHER SET IS ON THE WAY! " + q);
        }
    }

    static Client[] clients;
    public static AtomicInteger opens;

    public static void initClient(Test test) {
        opens = new AtomicInteger(0);
        clients = new Client[total];

        ClientEvents dev = new ClientEvents() {

            @Override
            public void OnError(Client c, String Message) {
                System.out.println("Error received:" + Message);
            }

            @Override
            public void OnConnect(Client c) {
                int n = opens.incrementAndGet();
                System.out.println("Total :" + n);
            }

            @Override
            public void OnClose(Client c) {
                int n = opens.decrementAndGet();
                System.out.println("Total :" + n);
            }

            @Override
            public void OnEventLog(Client c, String log, LogLevel level) {
                if(level == LogLevel.Critical)
                    System.out.println("WARNING:" + c.GetClientId() + ":" + log);
            }

            @Override
            public void OnSubscription(Client c, Boolean subscribe, String group) {

            }
        };

        for (int i = 0; i < total; i++) {
            clients[i] = new Client(new Test(), "chat", "NUBISA-STANDARD-KEY-CHANGE-THIS" , ip, port, false, true);

            clients[i].Events = dev;
        }
    }
}

