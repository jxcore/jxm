package jxm.JWS.FR;

import jxm.JWS.EX.InvalidFrameException;

import java.nio.ByteBuffer;


public interface Framedata {
    public enum Opcode {
        CONTINUOUS, TEXT, BINARY, PING, PONG, CLOSING
        // more to come
    }

    public boolean isFin();

    public boolean getTransfereMasked();

    public Opcode getOpcode();

    public ByteBuffer getPayloadData();// TODO the separation of the application data and the extension data is yet to be done

    public abstract void append(Framedata nextframe) throws InvalidFrameException;
}
