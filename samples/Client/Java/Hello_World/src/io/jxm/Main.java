package io.jxm;

import jxm.Callback;
import jxm.Client;
import jxm.ClientEvents;
import jxm.LogLevel;

public class Main {

	public static void main(String[] args) {

		ClientEvents events = new ClientEvents() {
		
			@Override
			public void OnConnect(Client c) {
				System.out.println("Connected");
			}
		
			@Override
			public void OnClose(Client arg0) {
				System.out.println("Disconnected");
			}
		
			@Override
			public void OnError(Client c, String Message) {
				System.out.println("Error received:" + Message);
			}
		
			@Override
			public void OnEventLog(Client arg0, String arg1, LogLevel arg2) {
				System.out.println("Log, message: " + arg1);
			}
			
		   @Override
		    public void OnSubscription(Client c, Boolean subscribed, String group) {
		        System.out.print("subscribed? : " + subscribed + ", group: " + group);
		    }
		};

		Callback callback = new Callback() {
			@Override
			public void call(Object o, Integer err) throws Exception {
				if (err == 0) {
					System.out.println("Received from the server " + o.toString());
				}
			}
		};

		// let's create a client instance
		Client client = new Client(null, "helloworld",
				"NUBISA-STANDARD-KEY-CHANGE-THIS", "localhost", 8000, false,
				true);

		// let's assign events object
		client.Events = events;

		// we will try to connect now
		if (client.Connect()) {
			System.out.println("ready!");

			// let's call the server-side method "serverMethod" 
			// from the client-side!
			// in turn, as a response, the server will invoke
			// client's local "callback" defined above!
			client.Call("serverMethod", "Hello", callback);
		}
	}
}
