@echo off

cd test

%1 test-connect.js

%1 test-call.js
%1 test-call-encoding-multiple.js

%1 test-call-and-callback.js
%1 test-call-and-callback-encoding.js

%1 test-server-sendToAll.js
%1 test-server-sendToAll-multiple-clients.js

%1 test-client-subscribe.js
%1 test-client-unsubscribe.js

%1 test-client-sendToGroup.js
%1 test-client-sendToGroup-multiple-clients.js

%1 test-server-subscribeClient.js
%1 test-server-unSubscribeClient.js