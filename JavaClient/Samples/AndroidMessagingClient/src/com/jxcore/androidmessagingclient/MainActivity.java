/**
 * license (MIT) Copyright Nubisa Inc. 2014
 */

package com.jxcore.androidmessagingclient;

import jxcore.Client;
import jxcore.ClientEvents;
import jxcore.LogLevel;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;
import android.app.Activity;
import android.view.Menu;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;

public class MainActivity extends Activity {

	Button btn = null;
	EditText txtInput = null;
	TextView txtLog = null;

	Handler uiThreadHandler = new Handler() {
		public void handleMessage(Message msg) {
			Object o = msg.obj;
			if (o == null)
				o = "";

			addText(o.toString());
		}
	};
	jxcore.Callback callback = null;
	ClientEvents events = null;
	Client client = null;
	Integer cnt = 1;

	private void addTextToMain(String txt){
		Message msg = uiThreadHandler.obtainMessage();
		msg.obj = txt;
		uiThreadHandler.sendMessage(msg);
	}
	
	Thread thread = new Thread(new Runnable() {


		
		@Override
		public void run() {


//			String str = "Osiem";
//			String xxx = "";
//			try {
//				Gson g = new Gson();
//				xxx = g.toJson(str);
//				addTextToMain(xxx);
//			} catch(Exception ex) {
//				addTextToMain(ex.getMessage());
//			}
		
			

			if (client.Connect()) {
				addTextToMain("Ready.");	

				// let's call the server-side method "serverMethod" from the
				// client-side!
				// in turn, as a response, the backend service will invoke
				// client's local "callback" defined above!
				// client.Call("serverMethod", "Hello", callback);
			}
		}
	});

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		setContentView(R.layout.activity_main);

		btn = (Button) findViewById(R.id.button1);
		txtInput = (EditText) findViewById(R.id.editText1);
		txtLog = (TextView) findViewById(R.id.textView1);

		
		

		events = new ClientEvents() {

			@Override
			public void OnClientConnected(Client c) {
				System.out.println("Connected");
			}

			@Override
			public void OnClientDisconnected(Client arg0) {
				System.out.println("Disconnected");
			}

			@Override
			public void OnErrorReceived(Client c, String Message) {
				System.out.println("Error received:" + Message);
			}

			@Override
			public void OnEventLog(Client arg0, String arg1, LogLevel arg2) {
				System.out.println("Log, message: " + arg1);
			}
		};

		callback = new jxcore.Callback() {
			@Override
			public void call(Object o) throws Exception {
				addTextToMain("From server: " + o.toString());
//				System.out.println("Received from the server "
//						+ o.toString());
			}
		};
		

		// let's create a client instance
		client = new Client(new CustomMethods(), "helloworld",
				"NUBISA-STANDARD-KEY-CHANGE-THIS", "192.168.1.11", 8000,
				false, true);

		// let's assign events object
		client.Events = events;
		
		
		txtInput.setText("txt" + Integer.toString(cnt++));
		
		thread.start();
	}

	@Override
	public boolean onCreateOptionsMenu(Menu menu) {
		// Inflate the menu; this adds items to the action bar if it is present.
		getMenuInflater().inflate(R.menu.main, menu);
		return true;
	}

	public void btnClick(View view) {
		String s = txtInput.getText().toString();
		//txtLog.setText(s);
		
		client.Call("serverMethod", s, callback);
		
		txtInput.setText("txt" + Integer.toString(cnt++));
		
		
	}

	public void addText(String s) {
		String tmp = txtLog.getText().toString() + "\n";
		txtLog.setText(tmp + s);
	}

}
