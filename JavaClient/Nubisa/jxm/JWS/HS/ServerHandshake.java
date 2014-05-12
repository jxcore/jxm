package jxm.JWS.HS;

public interface ServerHandshake extends Handshakedata {
    public short getHttpStatus();

    public String getHttpStatusMessage();
}
