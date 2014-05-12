/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

package com.jxcore.androidmessagingclient;

public class CustomMethods {

	public CustomMethods() {
	}

	static Object q = new Object();

	static long count = 0;

	public void addText(Object response) {
		synchronized (q) {
			count++;
		}
		// if(count%500==0)
		// System.out.println(count + " messages received");
		System.out.println("Received from the server: "+response.toString());
	}

}
