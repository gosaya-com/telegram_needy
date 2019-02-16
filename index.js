var needmanager = require('needmanager');
var Bot = require('node-telegram-bot-api');

const call_or_conf = function(need, param, sys){
  if(typeof need[param] == 'function'){
    // TODO this could be problematic, use a different method like Choose
    need.req = need.req || [];
    const paramneedname = '_'+param+'#'+need.name;
    need.req.unshift(paramneedname);
    
    sys.register(new sys.Need({
      name: paramneedname,
      post:function(inputs){
        need[param].call(this, inputs);
      }
    }));

    let _pre = need.pre;
    need.pre = function(inputs){
      this.sys.forget(paramneedname);
      if(_pre)
        _pre.call(this, inputs);
      else
        this.ok();
    };

    let _post = need.post;
    need.post = function(inputs, payload){
      payload = payload || {};
      payload[param] = inputs[paramneedname];
      this.sys.forget(paramneedname); // This ensures there is no redundancy
      _post.call(this, inputs, payload);
    }

  } else {
    let _post = need.post;
    need.post = function(inputs, payload){
      payload = payload || {};
      payload[param] = need[param];
      _post.call(this, inputs, payload);
    }
  }
}

var tgneedy = function(options){
  var tself = this;
  var opts = options || {};
  this.opts = opts;
  if(!this.opts.sid)
    this.opts.sid = 'sid';
  needmanager.call(this, opts);
  if(opts.token){
    this.bot = new Bot(opts.token, {polling: true});
    opts.bot = this.bot;
  } else {
    this.bot = opts.bot;
  }

  this.base.options = opts;

  var oldEmit = this.bot.emit;
  var self = this;
  this.bot.emit = function(eventName, eventData){
    if( typeof eventData.chat !== 'undefined'){
      self.invoke(eventData.chat.id, eventName, eventData);
    } else if(typeof eventData.user !== 'undefined'){
      self.invoke(eventData.user.id, eventName, eventData);
    }
    oldEmit.call(self.bot, eventName, eventData);
  }

  var Need = this.Need;
  var Send = function(config){
    if(!config.name)
      throw "ERR: No name was assigned";
    if(!config.text)
      throw "ERR: No text was assigned";

    for(var i in config)
      this[i] = config[i];

    var _post = config.post;
    this.post = function(inputs, payload){
      var opts = this.options;
      opts.bot.sendMessage(inputs[opts.sid], payload.text, {reply_markup: {hide_keyboard: true}});
      if(_post)
        _post.call(this, inputs);
      else
        this.done();
    }
    call_or_conf(this, 'text', tself);
  }

  Need.Send = Send;

  var SendPhoto = function(config){
    if(!config.name)
      throw "ERR: No name was assigned";
    if(!config.photo)
      throw "ERR: No photo was assigned";
    for(var i in config)
      this[i] = config[i];

    var _post = config.post;
    this.post = function(inputs, payload){
      var opts = this.options;
      opts.bot.sendPhoto(inputs[opts.sid], payload.photo,{caption: payload.caption ,reply_markup: {hide_keyboard: true}});
      if(_post)
        _post.call(this, inputs);
      else
        this.done();
    }
    call_or_conf(this, 'caption', tself);
    call_or_conf(this, 'photo', tself);
  }

  Need.SendPhoto = SendPhoto;

  this.register(new Need({
    name: "_input#text",
    post: function(inputs){
      this.wait();
    },
    invokers: [
      {
        event: "text",
        callback: function(inputs, data){
          this.done(data.text);
        }
      }
    ]
  }))

  var Ask = function(config){
    if(!config.name)
      throw "ERR: No name was assigned";
    if(!config.text)
      throw "ERR: No text was assigned";

    for(var i in config)
      this[i] = config[i];

    this.req = config.req || [];
    let sendneed = new Need({
      name: '_send#'+config.name,
      post: function(inputs, payload){
        var opts = this.options;
        opts.bot.sendMessage(inputs[opts.sid], payload.text, {reply_markup: {hide_keyboard: true}});
        this.done();
      }
    });
    sendneed.text = config.text;
    call_or_conf(sendneed, 'text', tself);
    tself.register(sendneed);

    this.req.unshift('_send#'+config.name);
    this.req.unshift('_input#text');

    var _pre = config.pre;
    this.pre = function(inputs){
      this.sys.forget('_input#text');
      this.sys.forget('_send#'+config.name);
      if(_pre){
        _pre.call(this, inputs);
      } else {
        this.ok();
      }
    }

    var _post = config.post;
    this.post = function(inputs){
      var ans = inputs['_input#text'];
      this.sys.forget('_input#text');
      this.sys.forget('_send#'+config.name);
      if(_post){
        _post.call(this, inputs, ans);
      } else {
        this.done(ans);
      }
    }
  }
  Need.Ask = Ask;

  var Choose = function(config){
    if(!config.name)
      throw "ERR: No name was assigned";
    if(!config.text)
      throw "ERR: No text was assigned";
    if(!config.options)
      throw "ERR: No options was assigned";

    for(var i in config)
      this[i] = config[i];

    this.req = config.req || [];

    var _pre = config.pre;
    var _post = config.post;

    let sendneed = new Need({
      name: '_send#'+config.name,
      post: function(inputs, payload){
        var opts = this.options;
        let keyboard = [];
        let data = payload.options;
        for(let i in data){
          if(i%2 ==0){
            keyboard.push([{text: data[i]}])
          } else {
            keyboard[keyboard.length - 1].push({text: data[i]});
          }
        }
        opts.bot.sendMessage(inputs[opts.sid], payload.text, {reply_markup: { keyboard: keyboard }});
        this.sys.inform('_options#'+config.name, data);
        this.done();
      }
    });
    sendneed.text = config.text;
    sendneed.options = config.options;
    call_or_conf(sendneed, 'text', tself);
    call_or_conf(sendneed, 'options', tself);
    tself.register(sendneed);

    this.req.unshift('_send#'+config.name);
    this.req.unshift('_input#text');

    this.pre = function(inputs){
      this.sys.forget('_input#text');
      this.sys.forget('_send#'+config.name);
      if(_pre){
        _pre.call(this, inputs);
      } else {
        this.ok();
      }
    }

    this.post = function(inputs){
      var ans = inputs['_input#text'];
      var configoptions = inputs['_options#'+config.name];
      this.sys.forget('_send#'+config.name);
      this.sys.forget('_input#text');

      if (configoptions.indexOf(ans) === -1){
        // TODO a better option?
        this.sys.triggers[config.name].pre_done = false;
        return this.ok();
      }

      if(_post){
        _post.call(this, inputs, ans);
      } else {
        this.done(ans);
      }
    }
  }

  Need.Choose = Choose;

  var Path = function(config){
    if(!config.name)
      throw "ERR: No name was assigned";
    if(!config.text)
      throw "ERR: No text was assigned";
    if(!config.options)
      throw "ERR: No options was assigned";

    for(var i in config)
      this[i] = config[i];

    this.req = config.req || [];

    var _pre = config.pre;
    var _post = config.post;

    let sendneed = new Need({
      name: '_send#'+config.name,
      post: function(inputs, payload){
        var opts = this.options;
        let keyboard = [];
        let data = payload.options;
        let counter = 0;
        for(let i in data){
          if(counter%2 ==0){
            keyboard.push([{text: i}])
          } else {
            keyboard[keyboard.length - 1].push({text: i});
          }
          counter ++;
        }
        opts.bot.sendMessage(inputs[opts.sid], payload.text, {reply_markup: { keyboard: keyboard }});
        this.sys.inform('_options#'+config.name, data);
        this.done();
      }
    });
    sendneed.text = config.text;
    sendneed.options = config.options;
    call_or_conf(sendneed, 'text', tself);
    call_or_conf(sendneed, 'options', tself);
    tself.register(sendneed);

    this.req.unshift('_send#'+config.name);
    this.req.unshift('_input#text');

    this.pre = function(inputs){
      this.sys.forget('_input#text');
      this.sys.forget('_send#'+config.name);
      if(_pre){
        _pre.call(this, inputs);
      } else {
        this.ok();
      }
    }

    this.post = function(inputs){
      var ans = inputs['_input#text'];
      var configoptions = inputs['_options#'+config.name];
      this.sys.forget('_send#'+config.name);
      this.sys.forget('_input#text');

      if (Object.keys(configoptions).indexOf(ans) === -1){
        // TODO a better option?
        this.sys.triggers[config.name].pre_done = false;
        return this.ok();
      }

      if(_post){
        _post.call(this, inputs, ans);
        this.sys.trigger(configoptions[ans]);
      } else {
        this.done(ans);
        this.sys.trigger(configoptions[ans]);
      }
    }
  }
  Need.Path = Path;
}

tgneedy.prototype = needmanager.prototype;

tgneedy.Store = needmanager.Store;
module.exports = tgneedy;
