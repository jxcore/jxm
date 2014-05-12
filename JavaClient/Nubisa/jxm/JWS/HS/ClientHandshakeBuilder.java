package jxm.JWS.HS;

public interface ClientHandshakeBuilder extends HandshakeBuilder, ClientHandshake {
    public void setResourceDescriptor(String resourceDescriptor);
}
