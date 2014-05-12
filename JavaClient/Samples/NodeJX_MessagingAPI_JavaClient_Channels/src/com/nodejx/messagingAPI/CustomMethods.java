/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

package com.nodejx.messagingAPI;

import jxm.CustomMethodsBase;

public class CustomMethods extends CustomMethodsBase {

	public CustomMethods() {
	}

	public void clientsMethod(Object response) {
		System.out.println("Received from the server: " + response.toString());
        super.client.Close();
	}
}