POP3 Server with Microsfot Graph API (by Grassboy)
-------------------------------------------------

This repo is forked from [andris9/n3](https://github.com/andris9/n3)   
By copying the localStorage json in [Microsoft Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)   
We can build up a customize pop3 mail server to fetch mails in Outlook   

### Installation
1. ```git clone``` this repo
2. go to your repo's directory, run ```npm install```: You may got some errors when you try to ```npm install iconv```. Make sure you have installed gcc++(linux)/VC++(windows) compile tools in your environment
3. Open ```credentials.json``` and follow the instruction to copy/paste localStorage of [Microsoft Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer) into this file
4. Open ```.env``` file to set the default password
5. Run ```node pop3_server.js``` to run up the pop3 server

### Settings in GMail
1. Go to [Gmail Mail Settings](https://mail.google.com/mail/u/0/#settings/accounts) to add a new pop3 mail account
2. Set an arbitary mail account, it doesn't matters :D
3. Enter the server information about your pop3 server
   * an arbitary username
   * the password you've set in ```.env```
   * the hostname of your pop3 server.
4. Done, now you can sync emails from Outlook to GMail

### Known Issues
1. The AccessToken may expired unexpectly even if this repo will refresh access token every 15mins. You just need to re-copy the localStorage content in Microsoft Graph Exporer and restart the pop3 server.
2. When you reload GMail's Inbox rapidly, the pop3 server may reject your new connection due to there is another pop3 session in the same time
3. Even if your mail in Outlook has attachment, the attachment will not be shown in GMail's inbox list. But the attachment can still be access when you open the mail
4. This server can just receive mail from Outlook, you cannot send Outlook mail from this server.

### Why don't you just use the pop3 server setting provided by Outlook?
That's a good question!! It is obviously a better way.   
This solution is just another solution to sync Outlook mails into GMail by the special feature of Microsoft Graph Explorer   
Just for technical research, maybe some one else need it :D

-------------------------------------------------
#### The following is original README.md in [andris9/n3](https://github.com/andris9/n3)   

N3
====

**N3** is an experimental POP3 server for [node.js](http://nodejs.org). It doesn't actually fetch any real mail messages but is able to send arbitrary data in the form of e-mail messages to any POP3 enabled e-mail client. For example latest Twitter messages or blog posts etc.

The demo server (pop3_server.js) currently sends the same message with every request as a new message (with minor changes though). 

Secured connections
----------

**N3** supports both unencrypted connections on port 110. See pop3_server.js for examples.

Authentication
--------------

**N3** supports following authentication mechanisms:

  * USER
  * APOP
  * AUTH PLAIN
  * AUTH CRAM-MD5

Authentication system is extendable by allowing to add new methods to the *SASL AUTH* command.

For example to add a method *FOOBAR* (taken from *pop3_server.js*):

    // AUTH FOOBAR user pass
    N3.extendAUTH("FOOBAR",function(authObj){
        var params = authObj.params.split(" "),
            user = params[0],
            pass = params[1];

        if(!user) // username is not set
            return "-ERR Authentication error. FOOBAR expects <user> <password>"

        return authObj.check(user, pass);
    });

When the client asks for server capabilities with *CAPA*, the *SASL* response will be

    CLIENT: CAPA
    SERVER: ...
    SERVER: SASL PLAIN CRAM-MD5 FOOBAR

The client is then able to log in with the method FOOBAR which expects username and password for its parameters

    CLIENT: AUTH FOOBAR andris 12345
    SERVER: +OK You are now logged in

See *sasl.js* for more complex examples - *PLAIN* and *CRAM-MD5* (*APOP* and *USER* are built in methods and do not go through the *SASL AUTH* interface).

Usage
-------

Install with npm

    npm install pop3-n3

Require the module

    var n3 = require("pop3-n3");

1. Run *pop3_server.js* and add a POP3 account to your e-mail client pointing to the node.js server. With the demo script usernames don't matter, any name goes, but the password needs to be 12345

       node pop3_server.js

For example, if you run *pop3_server.js* in *localhost* then the incoming settings should be something like:

    protocol: pop3
    server: localhost
    port: 110
    username: anything_goes
    password: 12345
    
NB! Some clients (iPhone) require valid SMTP server in order to add a new account. You can use any valid SMTP server.

License
-------

MIT. If you make any impromevents to the POP3 server code, then it would be nice to push the changes to here also (waiting for improvements to the protocol, new authentication methods etc.).

NB
-------

Make sure that port 110 is open for incoming connections!
