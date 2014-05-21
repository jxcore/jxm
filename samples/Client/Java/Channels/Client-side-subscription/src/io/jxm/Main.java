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
				final Client cli = c;
				try {
					c.Subscribe("programmers", new Callback() {
						@Override
						public void call(Object o, Integer err) throws Exception {
							if (err > 0) {
								System.out.println("Error while subscribing to the group: " + 
										o.toString() + ". Error code:" + err.toString());
							} else {
								System.out.println("Subscribed to " + o.toString());
								cli.SendToGroup("programmers", "clientsMethod",
										"Hello from Java client!", null);
							}
						}
					});
				} catch (Exception e) {
					System.out.println("Cannot subscribe.");
				}
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
				//System.out.println("Log, message: " + arg1);
			}

			@Override
			public void OnSubscription(Client client, Boolean subscribed, String group) {
				// TODO Auto-generated method stub
				
			}
		};
		
		// let's create a client instance
		Client client = new Client(new CustomMethods(), "channels",
				"NUBISA-STANDARD-KEY-CHANGE-THIS", "localhost", 8000, false,
				true);

		// let's assign events object
		client.Events = events;

		// we will try to connect now
		if (client.Connect()) {
			System.out.println("ready!");
		}
	}
}
