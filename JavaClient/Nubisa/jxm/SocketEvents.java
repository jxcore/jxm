/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */
package jxm;


public interface SocketEvents {
    public void close();

    public void error(Exception e);

    public void message(String message);

    public void open();
}
