/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */
package jxm;

import java.io.IOException;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.util.ArrayList;
import java.util.List;


public class SocketReceiver
        extends Thread {
    private SocketEvents events = null;
    private InputStream input = null;
    private volatile boolean stop = false;

    private Socketer websocket = null;

    public SocketReceiver(InputStream input, Socketer websocket) {
        this.input = input;
        this.websocket = websocket;
        this.events = websocket.events;
    }

    private String getText(Byte[] message) {
        int ln = message.length;
        byte[] mess = new byte[ln];
        for (int i = 0; i < ln; i++)
            mess[i] = message[i];

        try {
            return new String(mess, "UTF-8");
        } catch (UnsupportedEncodingException uee) {
            return null;
        }
    }

    private void handleError(Exception e) {
        dismiss();
        //websocket.receiveError(e);
    }


    public boolean isRunning() {
        return !stop;
    }


    public void run() {
        boolean frameStart = false;
        List<Byte> messageBytes = new ArrayList<Byte>();

        while (!stop) {
            try {
                int b = input.read();
                if (b == 0x00) {
                    frameStart = true;
                } else if (b == 0xff && frameStart == true) {
                    frameStart = false;
                    Byte[] message = messageBytes.toArray(new Byte[messageBytes.size()]);
                    events.message(getText(message));
                    messageBytes.clear();
                } else if (frameStart) {
                    messageBytes.add((byte) b);
                } else if (b == -1) {
                    handleError(new Exception("no data received from socket"));
                }
            } catch (IOException e) {
                handleError(e);
            }
        }
        handleError(new Exception("Socket receiver exited."));
    }


    public void dismiss() {
        stop = true;
    }
}
