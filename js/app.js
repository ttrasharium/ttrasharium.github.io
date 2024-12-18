    
    
    const fixLocationHash = () => {
      const hash = location.hash;
      const telegramHash = hash;
      const url = new URL(location.href);
      const startParam = url.searchParams.get("tgWebAppStartParam");
      let pageHash = "#/";
      if (startParam) {
        pageHash += atob(startParam);
      }
      return {tg: telegramHash, pg: pageHash};
    };

    const hashOptions = fixLocationHash();

    if (hashOptions.tg) {
      location.hash = hashOptions.tg;
    }

    const tgWebApp = window.Telegram.WebApp;
    tgWebApp.ready();
    tgWebApp.disableVerticalSwipes();
    tgWebApp.expand();
    ons.disableIconAutoPrefix();
    location.hash  = "";
    if (hashOptions.pg) {
      location.hash = hashOptions.pg;
    }
    
    // const C = "aHR0cHM6Ly94ZGd4NnNhN2o3NzJlN254d3k0ZjZrbmNpY3Z1ZG9kdDNmdWJlYmZiNWoyZ2Qya2tsd2R0eGJ1LWRhZG5sLm1hZ2ljLm9yZw==";
    // const C = "";
    const options = (method) => {
      return {
        method: method,
      };
    };

    const GET = options('GET');
    const POST = options('POST');
    
    const timeToSeconds = (time) => {
      const [hours, minutes, seconds] = 
        time.split(':').map(Number); 
      return (hours * 3600) + (minutes * 60) + seconds;
    };

    const globalVideos = {};
    const globalChannels = {};
    const globalChannelList = {};
    const VIDEO_ID_PATTERN = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|[^\/\n\s]*?[?&]v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

    const fetchApi = (url, options, callback) => {
      return fetch(`${atob(C)}${url}`, options)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Error response: ' + response.status);
          }
          return response.json().then(callback);
        }).catch((error) => {
          ons.notification.toast(error + '', { timeout: 2000 });
        });
    };

    const fetchChannel = (channelId, callback) => {
      fetchItem(channelId, globalChannels, `/api/channel/${channelId}`, callback);
    };

    const fetchVideo = (videoId, callback) => {
      fetchItem(videoId, globalVideos, `/api/video/${videoId}`, callback);
    };

    const fetchChannels = (callback) => {
       if (globalChannelList['channels']) {
          callback(globalChannelList['channels']);
       } else {
          fetchApi('/api/channel', GET, (data) => {
            globalChannelList['channels'] = data;
            callback(data);
          });
       }
    };

    const fetchItem = (id, holder, url, callback) => {
      if (holder[id]) {
        callback(holder[id]);
      } else {
        fetchApi(url, GET, (data) => {
          holder[id] = data;
          callback(data);
        });
      }
    };

    const YoutubeIframe = {
      template: '#youtube-iframe',
      data() {
        return {
          link: null,
        };
      },
      mounted() {
        this.link = 'https://www.youtube.com/embed/' + this.$route.params.id + '?start=' + this.$route.params.time + '&autoplay=1';
      },
      methods: {
        goBackToDetails() {
          const history = window.history.state.back;
          if (history) {
            this.$router.go(-1);
          } else {
            this.$router.push({ name: 'VideoDetails', params: { id: this.$route.params.id } });
          }
        },
      }
    };

    const Navigator = {
      template: '#navigator',
      methods: {
        navigateTo(route) {
          this.$router.push({ name: route });
          document.getElementById('menu').close();
        },
        sendVideo() {
          const options = {
            buttonLabels: ["Отмена", "OK"],
            placeholder: 'https://www.youtube.com/watch?v=...',
            title: 'Отправить видео',
            messageHTML: 'Вставьте ссылку на видео YouTube:',
          };
          ons.notification.prompt(options).then((link) => {
            if (!link) {
              return;
            }
            const linkUrl = link.replaceAll("m\\.youtube", "www.youtube");
            const match = linkUrl.match(VIDEO_ID_PATTERN);
            if (match) {
              fetchApi('/api/sendvideo/' + match[1], POST, (data) => {
                ons.notification.toast('Видео отправлено', { timeout: 2000 });
              });
            } else {
              ons.notification.toast('Неверная ссылка на видео', { timeout: 2000 });
            }
          });
        },
      },
    };

    const VideoList = {
      template: '#video-list',
      data() {
        return {
          loading: true
        };
      },
      computed: {
        videos() {
          return this.$root.$data.videos;
        },
      },
    mounted() {
      if (this.videos.length === 0) {
        this.refresh();
      } else {
        this.loading = false;
      }
    },
    methods: {
      viewVideo(video) {
        this.$router.push({ name: 'VideoDetails', params: { id: video.youtubeId } });
      },
      openMenu() {
        document.getElementById('menu').open();
      },
      refresh() {
        fetchApi('/api/video', GET, (data) => {
          this.$root.$data.videos = data;
          this.loading = false;
        });
      },
    },
  };

  const ChannelList = {
    template: '#channel-list',
    data() {
      return {
        loading: true
      };
    },
    computed: {
      channels() {
        return this.$root.$data.channels;
      },
    },
    mounted() {
      if (this.channels.length === 0) {
        this.refresh();
      } else {
        this.loading = false;
      }
    },
    methods: {
      viewChannel(channel) {
        this.$router.push({ name: 'ChannelDetails', params: { id: channel.id } });
      },
      openMenu() {
        document.getElementById('menu').open();
      },
      refresh() {
        fetchChannels((data) => {
          this.$root.$data.channels = data;
          this.loading = false;
        });
      },
    },
  };

  const SearchPage = {
    template: '#search-page',
    data() {
      return {
        channels: [],
        selectedChannel: '',
        searchTerm: '',
        searchResults: [],
        loading: false,
      };
    },
    mounted() {
      fetchChannels((data) => {
        this.channels = data;
        this.loading = false;
      });
    },
    methods: {
      viewVideo(video) {
        this.$router.push({ name: 'VideoDetails', params: { id: video } });
      },
      goBack() {
        const history = window.history.state.back;
        if (history) {
          this.$router.go(-1);
        } else {
          this.$router.push({ name: 'ChannelList' });
        }
      },
      search() {
        if (this.selectedChannel && this.searchTerm) {
          this.loading = true;
          fetchApi(`/api/channel/${this.selectedChannel}/search/${this.searchTerm}`, GET, (data) => {
            this.searchResults = data;
            this.loading = false;
          });
        }
      },
    },
  };

  const ChannelDetails = {
    template: '#channel-details',
    data() {
      return {
        loading: true,
        videos: null,
      };
    },
    mounted() {
      this.refresh();
    },
    methods: {
      goBack() {
        const history = window.history.state.back;
        if (history) {
          this.$router.go(-1);
        } else {
          this.$router.push({ name: 'ChannelList' });
        }
      },
      openMenu() {
        document.getElementById('menu').open();
      },
      viewVideo(video) {
        this.$router.push({ name: 'VideoDetails', params: { id: video.youtubeId } });
      },
      refresh() {
        fetchChannel(this.$route.params.id, (data) => {
          this.videos = data;
          this.loading = false;
        });
      },
    }
  };

    const ViolationsPage = {
     template: "#video-violations",
     props:['video', 'items']
    };

    const VideoDetailItem = {
      props: ['item'],
      template: '#video-detail-item',
      emits: ['open-action-sheet'],
      methods: {
        openActionSheet(item) {
          this.$emit('open-action-sheet', item);
        },
        replaceSpeaker(text) {
          return text.replace(/^Speaker\s\d+:\s*/, '');
        }
      }
    };

    const VideoActionSheet = {
      props: ['item', 'actionSheetVisible'],
      template: "#video-fragment-actions",
    };

    const VideoDetails = {
      template: '#video-details',
      data() {
        return {
          loading: true,
          selectedVideo: null,
          actionSheetVisible: false,
          selectedItem: null,
        };
      },
      computed: {
        videos() {
          return this.$root.$data.videos;
        }
      },
      mounted() {
        fetchVideo(this.$route.params.id, (data) => {
          this.selectedVideo = data;
          this.loading = false;
        });
      },
      methods: {
        goBack() {
          const history = window.history.state.back;
          if (history) {
            this.$router.go(-1);
          } else {
            this.$router.push({ name: 'VideoList' });
          }
        },
        handleOpenActionSheet(data) {
          this.selectedItem = data;
          this.actionSheetVisible = true;
        },
        openYoutube() {
          const link = 'https://www.youtube.com/watch?v=' + this.selectedVideo.id + '&t=' + timeToSeconds(this.selectedItem.s);
          window.open(link, '_blank');
          this.actionSheetVisible = false;
        },
        openYoutubeIframe() {
          this.actionSheetVisible = false;
          this.$router.push({ name: 'YoutubeIframe', params: { id: this.selectedVideo.id, time: timeToSeconds(this.selectedItem.s) } });
        },
        copyYoutubeLink() {
          const link = 'https://www.youtube.com/watch?v=' + this.selectedVideo.id + '&t=' + timeToSeconds(this.selectedItem.s);
          if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(link).then(() => {
              ons.notification.toast('Ссылка скoпирована', { timeout: 2000 });
              this.actionSheetVisible = false;
            }); 
          }
          this.actionSheetVisible = false;
        },
        videoDownload() {
          fetchApi(`/api/video/${this.selectedVideo.id}/download`, POST, (data) => {
            ons.notification.toast('Ссылка отправлена в ваш чат с ботом', { timeout: 2000 });
            this.actionSheetVisible = false;
          });
        }
      },
    };

    const routes = [
    { path: '/', component: VideoList, name: 'VideoList', meta: { transition: 'pulse' } },
    { path: '/video/:id', component: VideoDetails, name: 'VideoDetails', meta: { transition: 'pulse' } },
    { path: '/video/:id/youtube/:time', component: YoutubeIframe, name: 'YoutubeIframe', meta: { transition: 'pulse' } },
    { path: '/channel', component: ChannelList, name: 'ChannelList', meta: { transition: 'pulse' } },
    { path: '/channel/:id', component: ChannelDetails, name: 'ChannelDetails', meta: { transition: 'pulse' } },
    { path: '/search', component: SearchPage, name: 'SearchPage', meta: { transition: 'pulse' } },
  ];

    const router = VueRouter.createRouter({
      history: VueRouter.createWebHashHistory(),
      routes,
    });

    const app = Vue.createApp({
      data() {
        return {
          videos: [],
          channels: [],
          selectedVideo: null,
        };
      },
      mounted() {
        
        const headers = new Headers({'Authorization': 'twa ' + tgWebApp.initData});
        GET.headers = headers;
        POST.headers = headers;
      },
    });
    app.use(router);
    app.use(VueOnsen);
    app.component('video-detail-item', VideoDetailItem);
    app.component('violations-page', ViolationsPage);
    app.component('video-action-sheet', VideoActionSheet);
    app.component('navigator', Navigator);
    app.mount('#app');
