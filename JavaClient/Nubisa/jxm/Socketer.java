/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */
package jxm;

import jxm.JWS.FR.Framedata;
import jxm.JWS.HS.ServerHandshake;

import java.net.URI;


public class Socketer extends WebSocketClient
        implements PSocket {
    private volatile boolean connected = false;
    public SocketEvents events = null;


    public Socketer(URI url)
            throws Exception {
        this(url, null);
    }


    public Socketer(URI url, String protocol)
            throws Exception {
        super(url);
    }

    @Override
    public void onOpen(ServerHandshake handshakedata) {
        //System.out.println( "opened connection" );
        events.open();
        // if you plan to refuse connection based on ip or httpfields overload: onWebsocketHandshakeReceivedAsClient
    }

    @Override
    public void onMessage(String message) {
        //System.out.println( "received: " + message );
        events.message(message);
    }

    @Override
    public void onFragment(Framedata fragment) {
        //System.out.println( "received fragment: " + new String( fragment.getPayloadData().array() ) );
    }

    @Override
    public void onClose(int code, String reason, boolean remote) {
        // The codecodes are documented in class org.java_websocket.framing.CloseFrame
        //System.out.println( "Connection closed by " + ( remote ? "remote peer" : "us" ) );
        events.close();
    }

    @Override
    public void onError(Exception ex) {
        //ex.printStackTrace();
        // if the error is fatal then onClose will be called additionally
        events.error(ex);
    }
}
