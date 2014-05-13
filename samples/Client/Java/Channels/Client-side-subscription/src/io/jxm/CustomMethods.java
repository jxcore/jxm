package io.jxm;

import jxm.Client;
import jxm.CustomMethodsBase;

public class CustomMethods extends CustomMethodsBase {
	
	public CustomMethods() { 
	}

	public void clientsMethod(Object response) {
		System.out.println("Received from the server: " + response.toString());
		super.client.Close();
	}
}