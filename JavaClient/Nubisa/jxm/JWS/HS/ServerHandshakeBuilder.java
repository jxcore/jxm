package jxm.JWS.HS;

public interface ServerHandshakeBuilder extends HandshakeBuilder, ServerHandshake {
    public void setHttpStatus(short status);

    public void setHttpStatusMessage(String message);
}
