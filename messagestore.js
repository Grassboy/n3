var mime = require("./mime");
var msGraph = require("./msGraph");

// Message handling per session

this.MessageStore = MessageStore;

function MessageStore(user){
    console.log("MessageStore created");
    var that = this;
    this.user = user;
    var curtime = new Date().toLocaleString();
    this.messages = [];
    this.promise = new Promise(function(resolve, reject){
        (async function(){
            var unread_list = await msGraph.getUnreadMailList();
            for(var i = 0; i < unread_list.length; i++) {
                var d = unread_list[i];
                var mime = await msGraph.getMailMIME(d.id);
                that.addMessage({
                    is_mime: true,
                    mime: mime,
                    orig_id: d.id
                });
                await msGraph.markAsRead(d.id);
            }
            resolve();
        })();
    });
    if(typeof this.registerHook == "function")
        this.registerHook();
}

MessageStore.prototype.registerHook = null;

MessageStore.prototype.length = 0;
MessageStore.prototype.size = 0;
MessageStore.prototype.messages = [];
MessageStore.prototype.counter = 0;

MessageStore.prototype.addMessage = function(message){
    message = message || {};
    if(!message.date)
        message.date = +new Date();
    message.uid = "uid"+(++this.counter)+(+new Date());
    
    message.size = this.buildMimeMail(message).length;
    this.messages.push(message);
    this.length++;
    this.size += message.size;
};

MessageStore.prototype.stat = function(callback){
    callback(null, this.length, this.size);
}

MessageStore.prototype.list = function(msg, callback){
    var result = [];
    if(msg){
        if(isNaN(msg) || msg<1 || msg>this.messages.length || 
                                this.messages[msg-1].deleteFlag)
            callback(null, false);
        return msg+" "+this.messages[msg-1].size;
    }
    for(var i=0, len = this.messages.length;i<len;i++){
        if(!this.messages[i].deleteFlag)
            result.push((i+1)+" "+this.messages[i].size)
    }
    callback(null, result);
}

MessageStore.prototype.uidl = function(msg, callback){
    var result = [];
    if(msg){
        if(isNaN(msg) || msg<1 || msg>this.messages.length || 
                                this.messages[msg-1].deleteFlag)
            callback(null, false);
        callback(null, msg+" "+this.messages[msg-1].uid);
    }
    for(var i=0, len = this.messages.length;i<len;i++){
        if(!this.messages[i].deleteFlag)
            result.push((i+1)+" "+this.messages[i].uid)
    }
    callback(null, result);
}

MessageStore.prototype.retr = function(msg, callback){
    var that = this;
    if(!msg || isNaN(msg) || msg<1 || msg>that.messages.length || 
                                that.messages[msg-1].deleteFlag)
        return callback(null, false);
    var mail = that.messages[msg-1];
    if(mail.is_mime) {
        return msGraph.markAsRead(mail.orig_id).then(function(){
            return callback(null, that.buildMimeMail(that.messages[msg-1]));
        });
    } else {
        return callback(null, that.buildMimeMail(that.messages[msg-1]));
    }
}

MessageStore.prototype.dele = function(msg, callback){
    if(!msg || isNaN(msg) || msg<1 || msg>this.messages.length || 
                                this.messages[msg-1].deleteFlag)
        return callback(null, false);
    this.messages[msg-1].deleteFlag = true;
    this.length--;
    this.size -= this.messages[msg-1].size;
    return callback(null, true);
}

MessageStore.prototype.rset = function(){
    for(var i=0, len = this.messages.length; i<len;i++){
        if(this.messages[i].deleteFlag){
            this.messages[i].deleteFlag = false;
            this.length++;
            this.size += this.messages[i].size;
        }
    }
}

MessageStore.prototype.removeDeleted = function(){
    for(var i=this.messages.length-1; i>=0;i--){
        if(this.messages[i].deleteFlag){
            this.messages.splice(i,1);
            console.log("Deleted MSG #"+(i+1));
        }
    }
}


/**
 * MessageStore#buildMimeMail(options) -> String
 * - options (Object): e-mail options
 *   - is_mime: true: this mail is already mime format 
 *             false: this mail is not mime format (the n3 original format)
 *
 *   for is_mime == true:
 *   - mime: the mime content of the mail
 *
 *   for is_mime == false:
 *   - fromName (String): the name of the sender
 *   - fromAddress (String): the e-mail address of the sender
 *   - toName (String): the name of the recepient
 *   - toAddress (String): the e-mail address of the recepient
 *   - date (Number): JS timestamp
 *   - subject (String): title of the message
 *   - text (String): plain text version of the message
 *   - html (String): html version of the message
 * 
 * Generates a MIME formatted e-mail message to be sent to the client
 **/
MessageStore.prototype.buildMimeMail = function(options){
    options = options || {};
    if(options.is_mime) {
        //console.log(options.mime.length, 'bytes');
        return options.mime;
    }

    var from, to, subject, date, mime_boundary, attachments, header, body;
    
    from = [];
    if(options.fromName)
        from.push(mime.encodeMimeWord(options.fromName, "Q"));
    if(options.fromAddress)
        from.push('<'+options.fromAddress+'>');
    from = from.length?from.join(" "):"unknown@localhost";
    
    to = [];
    if(options.toName)
        to.push(mime.encodeMimeWord(options.toName, "Q"));
    if(options.toAddress)
        to.push('<'+options.toAddress+'>');
    to = to.length?to.join(" "):"unknown@localhost";
    
    subject = mime.encodeMimeWord(options.subject || 'untitled message', "Q");
    
    date = (options.date?new Date(options.date):new Date()).toGMTString();
    
    mime_boundary = '----bd_n3-lunchhour'+(+new Date())+'----';
    
    // header
    header = mime.foldLine('From: '+from)+"\r\n"+
        mime.foldLine('To: '+to)+"\r\n"+
        mime.foldLine('Date: '+date)+"\r\n"+
        mime.foldLine('Subject: '+subject)+"\r\n"+
        mime.foldLine('MIME-Version: 1.0')+"\r\n"+
        mime.foldLine('Content-Type: multipart/alternative; boundary="'+mime_boundary+'"')+"\r\n"+
        "\r\n";

    attachments = [];
    if(options.text){
        attachments.push(
                'Content-Type: text/plain; charset="utf-8"'+"\r\n"+
                'Content-Transfer-Encoding: quoted-printable'+"\r\n"+
                "\r\n"+
                mime.encodeQuotedPrintable(options.text)
        );
    }

    if(options.html){
        attachments.push(
                'Content-Type: text/html; charset="utf-8"'+"\r\n"+
                'Content-Transfer-Encoding: quoted-printable'+"\r\n"+
                "\r\n"+
                mime.encodeQuotedPrintable(options.html)
        );
    }
    
    if(!attachments.length){
        attachments.push(
                'Content-Type: text/plain; charset="utf-8"'+"\r\n"+
                'Content-Transfer-Encoding: base64'+"\r\n"+
                "\r\n"+
                mime.encodeBase64("(empty message)")
        );
    }

    body = '--'+mime_boundary+"\r\n"+ attachments.join("\r\n"+'--'+mime_boundary+"\r\n")+"\r\n"+'--'+mime_boundary+"--\r\n\r\n";
    
    return header + body;
}
