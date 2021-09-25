const Discord = require('discord.js');
const cron = require('node-cron');
const ffmpeg = require('ffmpeg-static');
const axios = require('axios');
const bot = require('./bot');
const config = require('./config.json');
const opus =  require('@discordjs/opus');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');

const client = new Discord.Client();
const queue = new Map();

client.login(config.token);

bot.keep_alive();
// const cronExpr = '45-59/5 22 * * *'; 
// cron.schedule(cronExpr, function(){

//   console.log('Sending reminder message');

//   client.channels.fetch(config.quarantineChannel).then(channel => channel.send("@everyone Play Standoff, you dumb mofos!!!")).catch(error => console.log("Error occured",error));

// }, {timezone: "Asia/Kolkata"});

const url = "https://evilinsult.com/generate_insult.php?lang=en";
let helpMessage = `These are the commands you can use for playing music:
        **>** - The prefix to use for a command.
        **>play <<artist and name of the song>>** - Plays a song. If a song is already playing, adds the song to queue.
        **>stop** - Stops the current playing song and leaves voice channel.
        **>skip** - Skip to next song in queue.
`
client.on("message", async message => {
    // console.log(message.content);
    if (message.author.bot) return false;
    // if (!message.content.startsWith(config.prefix)) return;
    if(message.mentions.has(client.user.id, {ignoreEveryone: true})){
      message.channel.send(`${helpMessage}`);
    }

    
    if (message.content.startsWith(config.prefix)){
      const serverQueue = queue.get(message.guild.id);

      if(message.content.startsWith(`${config.prefix}play`)){
        execute(message, serverQueue);
        return;
      }
      else if (message.content.startsWith(`${config.prefix}skip`)){
        skip(message, serverQueue);
        return;
      }
      else if (message.content.startsWith(`${config.prefix}stop`)){
        stop(message, serverQueue);
        return;
      }
      else if (message.content.startsWith(`${config.prefix}help`)){
        message.channel.send(`${helpMessage}`)
        return;
      }
      else if (message.content.startsWith(`${config.prefix}insult`)){
        if (message.mentions.has(`457131037336666123`,{ignoreEveryone: true})){ 
          message.reply("Haha. Nice try!").then(() => {
            console.log(`Sent a reply to creator`);
          })
          .catch(console.error);
          return;
        }
        args = message.content.split(" ")[1];
        insult(message, args);
        // const insult = await axios.get(url);
        // const resp = insult.data.replace(/&quot;/g,'"').replace(/&gt;/g,">");
        // message.reply(resp)
        // .then(() => {
        //   console.log(`Sent a reply to ${message.author.username}`);
        //   console.log('Reply',resp);
        //   })
        // .catch(console.error);
        return;
      }
      else{
        message.channel.send("Enter a valid command you fool!");
      }
    }
    return;
});

async function execute(message, serverQueue){
  const args = message.content.split(" ");
  const voiceChannel = message.member.voice.channel;
  let song = {};

  if(!voiceChannel){
    return message.channel.send(
      "You aren't in a voice channel to listen to music, Einstein");
  }
  const permissions = voiceChannel.permissionsFor(message.client.user);

  if(!permissions.has("CONNECT") || !permissions.has("SPEAK")){
    return message.channel.send("How the fuck can I play music if I don't have permissions to connect and/or speak!");
  }
  
  const video_finder = async (query) =>{
    const video_result = await ytSearch(query);
    return (video_result.videos.length > 1) ? video_result.videos[0] : null;
  }

  const video = await video_finder(args.join(' '));
  if (video){
      song = { title: video.title, url: video.url }
  } else {
        message.channel.send('Well what a shit request. Didnt find a video result for that query');
  }

  if(!serverQueue) {
    const queueConstruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 6,
      playing: true,
    };

    queue.set(message.guild.id, queueConstruct);
    queueConstruct.songs.push(song);

    try{
      var connection = await voiceChannel.join();
      queueConstruct.connection = connection;
      play(message.guild, queueConstruct.songs[0]);
    } catch (err){
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  }
  else{
    serverQueue.songs.push(song);
    console.log(serverQueue.songs);
    return message.channel.send(`👍 ${song.title} has been added to the queue`);
  }
}

function play(guild, song){
  const serverQueue = queue.get(guild.id);
  if (!song){
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }
  const dispatcher = serverQueue.connection
                    .play(ytdl(song.url, { filter: 'audioonly' }), {volume: 0.1})
                    .on("finish", () => {
                      serverQueue.songs.shift();
                      play(guild, serverQueue.songs[0]);
                    })
                    .on("error", error => console.error(error));
  // dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`🎶 Now playing: **${song.title}**`);

}

function skip(message, serverQueue){
  if (!message.member.voice.channel) {
    return message.channel.send("You have to be in a voice channel to skip!");
  }
  if (!serverQueue) {
    return message.channel.send("There are no songs to skip!");
  }
  serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  
  if (!serverQueue){
    serverQueue.connection.dispatcher.end();
    return message.channel.send("There is no song that I could stop!");
  }
    
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

async function insult(message, args){
  const insult = await axios.get(url);
  const resp = insult.data.replace(/&quot;/g,'"').replace(/&gt;/g,">");
  if (args){
    if (args)
    message.channel.send(`${args} ${resp}`);
  }
  else{
    message.channel.send(`Mention whom I should be roasting`);
  }
}

const cowinURL = "https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/findByDistrict?district_id=294&date=17-05-2021";
