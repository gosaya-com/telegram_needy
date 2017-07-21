# Telegram Needy
---

Telegram needy is an extention to [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api) and [needjs](https://github.com/gosaya-com/needjs) which will give you the benefits of needs inside your telegram bots.

## Install
```
$ npm install --save telegram-needy
```

## Usage
``` javascript
const tgneedy = require('telegram-needy');

// Replace the value with your token
const token = 'YOUR_TELEGRAM_BOT_TOKEN';

const sys = new tgneedy({
    token: token
});

const bot = sys.bot;
const Need = sys.Need;

sys.register(new Need.Send({
    name: 'goodbye',
    text: 'Good bye\nHave fun!'
}));

sys.register(new Need.Ask({
    name: 'fave',
    text: 'What is your favorite thing about needjs?'
}));

sys.register(new Need.Choose({
    name: 'experience',
    text: 'Do you have any previous experience with needjs?',
    options: ['yes', 'no']
}));

sys.register(new Need({
    name: 'main',
    req: ['goodbye', 'experience', 'fave'],
    post: function(inputs){
        // To access the result of a previously satisfied need you should
        // call inputs['NeedName']
        console.log('user has experience?' + inputs['experience']);
        console.log('user's favorite thing?' + inputs['fave']);
        this.done();
    }
}));

bot.onText(/\/start/, (msg, match)=>{
    sys.trigger(msg.chat.id, 'main');
});
```

A `Need` Should have the following properties:

* `name`: name of the need.
* `post`: A function that will be called in order to satisfy the need. (See bellow for furthure information)

and each `Need` could have the following properties:

* `req`: An array of need names to indicate which needs should be satisfied before calling the `post` function.
* `pre`: A function that will be called before any of the `req` uired needs. (See bellow for furthure information)
* `invokers`: An array of event listeners. See bellow for more information.

There are a few extended needs you can use in needjs:

* `Need.OneOf` could be used in the req array *ONLY*. When it is used the system will try to satisfy one the needs starting from left.

There are a few extended needs in telegram-needy:

* `Need.Send` should be used inside register. This accepts an additional parameter `text` that will be sent to the user when calling the `post` function.
* `Need.Ask` Like `Send` this will also accept a `text` parameter that will be sent upon calling the `pre` function and when the user replies it will be satisfied with the user's respond as it's value.
* `Need.Choose` Like ask but the users repond *MUST* be one of the options provided inside `options`.

### Events
Your needs could listen to events that are emitted by the node-telegram-bot-api while they are not satisfied. To do so you should append a `invokers` field to your need in this way:
``` javascript
sys.register(new Need({
    ...
    invokers: [
        {
            event: "event Name",
            callback : function(inputs, data){
               ....
            }
        }
    ]
}))
```

`invokers` is an array of objects who have `event` and `callback`.`event` could be a string or an array of strings, while `callback` is a function as described bellow.

Your events will be invoked as long as they are not satisfied. If satisfied in order for them to be invoked again the system must `forget` their value.

### Functions

There are 3 kinds of functions in the needjs enviornment:
* `post(inputs, [respond])`
* `pre(inputs)`
* `callback(inputs, eventData)`

Inside any of these functions you *MUST* call one of the following functions. Not calling them inside your functions will result in unexpected behaviour.

* `this.done([value])` tell the system that this need is satisfied and the resulting value of this need is `value`. This is optional if you don't have any valu eyou can call `this.done()` and the sysem will assign `true` to it.
* `this.fail()` tell the system that this need has failed and it should look for a way to recover. If the system can not find a way (for example inside a `Need.OneOf`) it will throw an error.
* `this.wait()` tell the system that this need needs time inorder to decide if it can be satisfied or not. Usually you want to use this inside the `post` of needs that require a certain event to be invoked.
* `this.ok()` tell the system that I'm done and I have nothing to do for now. (Used mostly inside `pre`, has it's usage in `post` but is completly useless inside `callback`).

*NOTE*: The Ask and Choose functions could have an optional `post`, which has an extra parameter called respond, which includes the user's respond.

## Using different bot library
It is possible to use an extention of the `node-telegram-bot-api`. You could use libraries like `tgfancy` or `bot-brother`. To do so create your bot and give the tgneedy options a bot parameter like this:

```javascript
const CustomBot = require('custom-bot-library');

bot = new CustomBot({
    ...
});

var sys = new tgneedy({
    bot: bot
});
```

You should either assign bot or token. Assigning both bot and token will result in the system using the default `node-telegram-bot-api`.

## Using a different store
By default telegram-needy uses the `MemoryStore` in `needmanager`. You could however use any `express-session` comptaible store. [Full list](https://github.com/expressjs/session#compatible-session-stores). To use a different store, do this:

```javascript
var CustomStore = require('custom-store-library');
var store = new CustomStore(...);

var sys = new tgneedy({
    ...
    store: my_store
})
```
