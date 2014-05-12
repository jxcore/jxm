/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */
package jxm;


public interface PSocket {
    public void close()
            throws Exception;


    public void connect()
            throws Exception;


    public void send(String txt)
            throws Exception;
}
