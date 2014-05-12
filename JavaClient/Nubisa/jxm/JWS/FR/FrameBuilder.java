package jxm.JWS.FR;

import jxm.JWS.EX.InvalidDataException;

import java.nio.ByteBuffer;


public interface FrameBuilder extends Framedata {

    public abstract void setFin(boolean fin);

    public abstract void setOptcode(Opcode optcode);

    public abstract void setPayload(ByteBuffer payload) throws InvalidDataException;

    public abstract void setTransferemasked(boolean transferemasked);

}