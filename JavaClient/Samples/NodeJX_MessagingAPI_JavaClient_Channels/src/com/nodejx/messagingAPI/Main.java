/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

package com.nodejx.messagingAPI;

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
						public void call(Object o) throws Exception {
							System.out.println("Subscribed to " + o.toString());
							cli.SendToGroup("programmers", "clientsMethod",
									"Hello from client!");
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
			//	System.out.println("Log, message: " + arg1);
			}

            @Override
            public void OnSubscription(Client c, Boolean subscribed, String group) {
                System.out.print("on subscription: subscribed = " + subscribed + ", group: " + group);
            }
		};

		// let's create a client instance
		final Client client = new Client(new CustomMethods(), "channels",
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
