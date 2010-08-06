/*
 * jQuery LiveTwitter 1.5.2
 * - Live updating Twitter plugin for jQuery
 *
 * Copyright (c) 2009-2010 Inge Jørgensen (elektronaut.no)
 * Licensed under the MIT license (MIT-LICENSE.txt)
 *
 * $Date: 2010/07/16$
 */

/*
 * Usage example:
 * $("#twitterSearch").liveTwitter('bacon', {limit: 10, rate: 15000});
 */

(function($){
	if(!$.fn.reverse){
		$.fn.reverse = function() {
			return this.pushStack(this.get().reverse(), arguments);
		};
	}
	$.fn.liveTwitter = function(query, options, callback){
		var domNode = this;
		$(this).each(function(){
			var settings = {};

			// Handle changing of options
			if(this.twitter) {
				settings = jQuery.extend(this.twitter.settings, options);
				this.twitter.settings = settings;
				if(query) {
					this.twitter.query = query;
				}
				this.twitter.limit = settings.limit;
				this.twitter.mode  = settings.mode;
				if(this.twitter.interval){
					this.twitter.refresh();
				}
				if(callback){
					this.twitter.callback = callback;
				}

			// ..or create a new twitter object
			} else {
				// Extend settings with the defaults
				settings = jQuery.extend({
					mode:      'search', // Mode, valid options are: 'search', 'user_timeline'
					rate:      15000,    // Refresh rate in ms
					limit:     10,       // Limit number of results
					refresh:   true
				}, options);

				// Default setting for showAuthor if not provided
				if(typeof settings.showAuthor == "undefined"){
					settings.showAuthor = (settings.mode == 'user_timeline') ? false : true;
				}

				// Set up a dummy function for the Twitter API callback
				if(!window.twitter_callback){
					window.twitter_callback = function(){return true;};
				}

				this.twitter = {
					settings:      settings,
					query:         query,
					limit:         settings.limit,
					mode:          settings.mode,
					interval:      false,
					container:     this,
					lastTimeStamp: 0,
					callback:      callback,

					// Convert the time stamp to a more human readable format
					relativeTime: function(timeString){
						var parsedDate = Date.parse(timeString);
						var delta = (Date.parse(Date()) - parsedDate) / 1000;
						var r = '';
						if (delta < 60) {
							r = delta + ' seconds ago';
						} else if(delta < 120) {
							r = 'a minute ago';
						} else if(delta < (45*60)) {
							r = (parseInt(delta / 60, 10)).toString() + ' minutos atr&aacute;s';
						} else if(delta < (90*60)) {
							r = 'an hour ago';
						} else if(delta < (24*60*60)) {
							r = '' + (parseInt(delta / 3600, 10)).toString() + ' horas atr&aacute;s';
						} else if(delta < (48*60*60)) {
							r = 'a day ago';
						} else {
							r = (parseInt(delta / 86400, 10)).toString() + ' dias atr&aacute;s';
						}
						return r;
					},

					// Update the timestamps in realtime
					refreshTime: function() {
						var twitter = this;
						$(twitter.container).find('span.time').each(function(){
							$(this).find('a').html(twitter.relativeTime(this.timeStamp));
						});
					},

					// Handle reloading
					refresh: function(initialize){
						var twitter = this;
						if(this.settings.refresh || initialize) {
							var url = '';
							var params = {};
							if(twitter.mode == 'search'){
								params.q = this.query;

								if(this.settings.geocode){
									params.geocode = this.settings.geocode;
								}
								if(this.settings.lang){
									params.lang = this.settings.lang;
								}
								if(this.settings.rpp){
									params.rpp = this.settings.rpp;
								} else {
									params.rpp = this.settings.limit;
								}
								
								// Convert params to string
								var paramsString = [];
								for(var param in params){
									if(params.hasOwnProperty(param)){
										paramsString[paramsString.length] = param + '=' + encodeURIComponent(params[param]);
									}
								}
								paramsString = paramsString.join("&");
								url = "http://search.twitter.com/search.json?"+paramsString+"&callback=?";
							} else if(twitter.mode == 'user_timeline') {
								url = "http://api.twitter.com/1/statuses/user_timeline/"+encodeURIComponent(this.query)+".json?count="+twitter.limit+"&callback=?";
							} else if(twitter.mode == 'list') {
								var username = encodeURIComponent(this.query.user);
								var listname = encodeURIComponent(this.query.list);
								url = "http://api.twitter.com/1/"+username+"/lists/"+listname+"/statuses.json?per_page="+twitter.limit+"&callback=?";
							}
							$.getJSON(url, function(json) {
								var results = null;
								if(twitter.mode == 'search'){
									results = json.results;
								} else {
									results = json;
								}
								var newTweets = 0;
								$(results).reverse().each(function(){
									var screen_name = '';
									var profile_image_url = '';
									if(twitter.mode == 'search') {
										screen_name = this.from_user;
										profile_image_url = this.profile_image_url;
										created_at_date = this.created_at;
									} else {
										screen_name = this.user.screen_name;
										profile_image_url = this.user.profile_image_url;
										// Fix for IE
										created_at_date = this.created_at.replace(/^(\w+)\s(\w+)\s(\d+)(.*)(\s\d+)$/, "$1, $3 $2$5$4");
									}
									var tweet_url = 'http://twitter.com/'+screen_name+'/statuses/'+this.id;
									var userInfo = this.user;
									var linkified_text = this.text.replace(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&\?\/.=]+/, function(m) { return m.link(m); });
									linkified_text = linkified_text.replace(/@[A-Za-z0-9_]+/g, function(u){return u.link('http://twitter.com/'+u.replace(/^@/,''));});
									linkified_text = linkified_text.replace(/#[A-Za-z0-9_\-]+/g, function(u){return u.link('http://search.twitter.com/search?q='+u.replace(/^#/,'%23'));});
									
									if(!twitter.settings.filter || twitter.settings.filter(this)) {
										if(Date.parse(created_at_date) > twitter.lastTimeStamp) {
											newTweets += 1;
											var tweetHTML = '<div class="tweet tweet-'+this.id+'">';
											if(twitter.settings.showAuthor) {
												tweetHTML += 
													'<img width="24" height="24" src="'+profile_image_url+'" />' +
													'<p class="text"><span class="username"><a href="http://twitter.com/'+screen_name+'">'+screen_name+'</a>:</span> ';
											} else {
												tweetHTML += 
													'<p class="text"> ';
											}
											tweetHTML += 
												linkified_text +
												' <span class="time"><a href="'+tweet_url+'">'+twitter.relativeTime(created_at_date)+'</a></span>' +
												'</p>' +
												'</div>';
											$(twitter.container).prepend(tweetHTML);
											var timeStamp = created_at_date;
											$(twitter.container).find('span.time:first').each(function(){
												this.timeStamp = timeStamp;
											});
											if(!initialize) {
												$(twitter.container).find('.tweet-'+this.id).hide().fadeIn();
											}
											twitter.lastTimeStamp = Date.parse(created_at_date);
										}
									}
								});
								if(newTweets > 0) {
									// Limit number of entries
									$(twitter.container).find('div.tweet:gt('+(twitter.limit-1)+')').remove();
									// Run callback
									if(twitter.callback){
										twitter.callback(domNode, newTweets);
									}
									// Trigger event
									$(domNode).trigger('tweets');
								}
							});
						}	
					},
					start: function(){
						var twitter = this;
						if(!this.interval){
							this.interval = setInterval(function(){twitter.refresh();}, twitter.settings.rate);
							this.refresh(true);
						}
					},
					stop: function(){
						if(this.interval){
							clearInterval(this.interval);
							this.interval = false;
						}
					},
					clear: function(){
						$(this.container).find('div.tweet').remove();
						this.lastTimeStamp = null;
					}
				};
				var twitter = this.twitter;
				this.timeInterval = setInterval(function(){twitter.refreshTime();}, 5000);
				this.twitter.start();
			}
		});
		return this;
	};
})(jQuery);