var needmanager = require('needmanager');
var Bot = require('node-telegram-bot-api');

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
    this.post = function(inputs){
      var opts = this.options;
      if(typeof config.text == 'function'){
        let self = this;
        self._done = self.done;
        self.done = function(text){
          opts.bot.sendMessage(inputs[opts.sid], text, {reply_markup: {hide_keyboard: true}});
          this.done = this._done;
          if(_post)
            _post.call(this, inputs);
          else
            this.done();
        }
        config.text.call(self, inputs);
      } else {
        opts.bot.sendMessage(inputs[opts.sid], config.text, {reply_markup: {hide_keyboard: true}});
        if(_post)
          _post.call(this, inputs);
        else
          this.done();
      }
    }
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
        this.post = function(inputs){
            var opts = this.options;
            if(typeof config.photo == 'function'){
              var self = this;
              self._done = self.done;
              self.done = function(photo){
                opts.bot.sendPhoto(inputs[opts.sid], photo,{caption: config.caption ,reply_markup: {hide_keyboard: true}});
                this.done = this._done;
                if(_post)
                    _post.call(this, inputs);
                else
                    this.done();
              };
              config.photo.call(self, inputs);
            } else {
              opts.bot.sendPhoto(inputs[opts.sid], config.photo,{caption: config.caption ,reply_markup: {hide_keyboard: true}});
              if(_post)
                  _post.call(this, inputs);
              else
                  this.done();
            }
        }
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
        this.req.push('_input#text');

        var _pre = config.pre;
        this.pre = function(inputs){
            this.sys.forget('_input#text');
            var opts = this.options;
            opts.bot.sendMessage(inputs[opts.sid], config.text, {reply_markup: {hide_keyboard: true}});
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
        if(config.options instanceof Function){
            this.req.unshift('_choice#'+config.name);
            this.req.unshift('_input#text');
            tself.register(new Need({
                name: '_choice#'+config.name,
                post: function(inputs){
                    var self = this;
                    self._done = self.done;
                    self.done = function(data){
                        var opts = self.options;
                        var keyboard = [];
                        for (var i in data){
                            // TODO make 2 optional?
                            if (i % 2 == 0){
                                keyboard.push([{text: data[i]}]);
                            } else {
                                keyboard[keyboard.length - 1].push({text: data[i]});
                            }
                        }
                        opts.bot.sendMessage(inputs[opts.sid], config.text, {reply_markup: {
                            keyboard: keyboard
                        }});
                        // TODO
                        self._done(data);
                    }
                    config.options.call(self, inputs);
                    // TODO
                }
            }));
            this.pre = function(inputs){
                this.sys.forget('_input#text');
                this.sys.forget('_choice#'+config.name);
                if(_pre){
                    _pre.call(this, inputs);
                } else {
                    this.ok();
                }
            }

            this.post = function(inputs){
                var ans = inputs['_input#text'];
                var configoptions = inputs['_choice#'+config.name];
                this.sys.forget('_choice#'+config.name);
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
        } else {
            this.req.unshift('_input#text');
            this.pre = function(inputs){
                this.sys.forget('_input#text');
                var opts = this.options;
                var keyboard = [];
                for (var i in config.options){
                    // TODO make 2 optional?
                    if (i % 2 == 0){
                        keyboard.push([{text: config.options[i]}]);
                    } else {
                        keyboard[keyboard.length - 1].push({text: config.options[i]});
                    }
                }
                opts.bot.sendMessage(inputs[opts.sid], config.text, {reply_markup: {
                    keyboard: keyboard
                }});
                if(_pre){
                    _pre.call(this, inputs);
                } else {
                    this.ok();
                }
            }

            this.post = function(inputs){
                var ans = inputs['_input#text'];
                this.sys.forget('_input#text');

                if (config.options.indexOf(ans) === -1){
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
    }

    Need.Choose = Choose;
}

tgneedy.prototype = needmanager.prototype;

tgneedy.Store = needmanager.Store;
module.exports = tgneedy;
