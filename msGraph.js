var axios = require('axios');
var qs = require('qs');
var fs = require('fs');
var credentials = require('./credentials.json');
(function(global){
    var ajax = axios.create({
        baseURL: 'https://graph.microsoft.com',
        headers: {
            'Origin': 'https://developer.microsoft.com'
        }
    });
    var updateCredentials = function(force_refresh){
        return new Promise(function(resolve, reject){    
            if(!credentials.access_token) {
                for(var k in credentials) {
                    if(k.indexOf('accesstoken') != -1){
                        var json = (JSON.parse(credentials[k]));
                        credentials.access_token = json.secret;
                        credentials.client_id = json.clientId;
                        credentials.expires = json.expiresOn*1000;
                        credentials.extend_expires = json.extendedExpiresOn*1000;
                        credentials.client_request_id = k.split('.')[0];
                    } else if(k.indexOf('refreshtoken')!=-1) {
                        var json = (JSON.parse(credentials[k]));
                        credentials.refresh_token = json.secret;
                    }
                }
            }
            if(force_refresh || (new Date()).getTime() > (credentials.expires - 1200000) && (new Date()).getTime() < credentials.extend_expires) {
                console.log('AccessToken expires, renew it...');
                ajax.request({
                    type: 'post',
                    url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
                    data: qs.stringify({
                        client_id: credentials.client_id,
                        scope: 'openid profile User.Read offline_access',
                        grant_type: 'refresh_token',
                        client_info: 1,
                        client_request_id: credentials.client_request_id,
                        refresh_token: credentials.refresh_token
                    })
                })
                .then(function(r){
                    var json = r.data;
                    credentials.access_token = json.access_token;
                    credentials.refresh_token = json.refresh_token;
                    credentials.expires = (new Date()).getTime()+3500000;
                    credentials.extend_expires = (new Date()).getTime()+3500000;
                    fs.writeFileSync('./credentials.json', JSON.stringify(credentials));
                    resolve(credentials);
                })
                .catch(function(r){
                    console.log((new Date()).toString().split(' ')[4],'AccessToken refresh failed...');
                    console.log(r);
                });
            } else if((new Date()).getTime() >= credentials.extend_expires) {
                console.log('AccessToken expires, and cannot refresh...QQ');
                process.exit();
            } else {
                console.log('AccessToken loaded');
            }
            fs.writeFileSync('./credentials.json', JSON.stringify(credentials));
            return resolve(credentials);
        });
    };
    setInterval(function(){
        console.log('Check for AccessToken...');
        updateCredentials().then(checkWhoAmI);
    }, 900000);
    global.apiCall = function(type, url, data){
        return global.ready.then(function(){
            return ajax.request({
                method: type,
                url: url,
                headers: {
                    'Authorization': 'Bearer '+credentials.access_token
                },
                data: data
            }).then(function(r){
                return r.data;
            }).catch(function(r){console.log(r.response.data)});
        });
    };
    var checkWhoAmI = function(){
        return ajax.request({
            type: 'post',
            url: '/v1.0/me',
            headers: {
                'Authorization': 'Bearer '+credentials.access_token
            }
        }).then(function(r){
            console.log('Current User:',r.data.mail);
        });
    };
    global.ready = updateCredentials(true).then(checkWhoAmI);
    global.getUnreadMailList = function(){
        return global.apiCall('get', '/v1.0/me/mailFolders/Inbox/messages?$filter=isRead ne true&$count=true&$select=id&$top=1000').then(function(r){
            //console.log(r, r.value.length);
            return r.value;
        });
    };
    global.markAsRead = function(message_id){
        return global.apiCall('patch', '/v1.0/me/messages/'+message_id+'?$select=id', {
            isRead: true
        });
    };
    global.getMailMIME = function(message_id){
        return global.apiCall('get', '/v1.0/me/messages/'+message_id+'/$value');
    };
    (async function(){
        return; // comment this line for testing;
        var list = await global.getUnreadMailList();
        console.log(list[0].id);
        var result = await global.getMailMIME(list[0].id);
        console.log(result);
        var result = await global.markAsRead(list[0].id);
        console.log(result);
        console.log(result.id, result.isRead);
        console.log('Unread Count', list.length);
    })();
})(this);
