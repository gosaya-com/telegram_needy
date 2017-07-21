var tgneedy = require('..');

var token = "YOUR_TELEGRAM_BOT_TOKEN";

const sys = new tgneedy({
    token: token,
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
        console.log('user has experience?' + inputs['experience']);
        console.log('user\'s favorite thing?' + inputs['fave']);
        this.done();
    }
}));

bot.onText(/\/start/, (msg, match)=>{
    sys.trigger(msg.chat.id, 'main');
});
