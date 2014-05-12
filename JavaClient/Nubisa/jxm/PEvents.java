/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */
package jxm;

public interface PEvents {
    public void ErrorReceived(String message);

    public void MessageReceived(String message);

    public void UpdateIsConnected(boolean connected);
}
