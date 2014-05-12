/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

package jxm;

public interface ClientEvents {
    public void OnConnect(Client c);

    public void OnClose(Client c);

    public void OnError(Client c, String message);

    public void OnEventLog(Client c, String log, LogLevel level);

    public void OnSubscription(Client c, Boolean subscribe, String group);
}
