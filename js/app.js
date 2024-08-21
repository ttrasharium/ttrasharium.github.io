
    ons.disableIconAutoPrefix();
    const tgWebApp = window.Telegram.WebApp;
    const C = "aHR0cHM6Ly94bjR4NHd0aWhtN29hbnVicWtuZmVjZjdicW94ZGp4c2Y3enRkZHo3dGhzZWViNWQ1YXVkdWVyLWRhZG5sLm1hZ2ljLm9yZw==";
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


    const fetchApi = (url, options, callback) => {
      return fetch(`${atob(C)}${url}`, options)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Error response: ' + response.status);
          }
          return response.json().then(callback);
        }).catch((error) => {
          ons.notification.toast(error, { timeout: 5000 });
        });
    };

    const fetchChannel = (channelId, callback) => {
      fetchItem(channelId, globalChannels, `/api/channel/${channelId}`, callback);
    };

    const fetchVideo = (videoId, callback) => {
      fetchItem(videoId, globalVideos, `/api/video/${videoId}`, callback);
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
          const history = this.$router.history;
          if (history && history.length > 1) {
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
      },
    };

    const VideoList = {
      template: '#video-list',
      computed: {
      videos() {
        return this.$root.$data.videos;
      },
    },
    mounted() {
      if (this.videos.length === 0) {
        this.refresh();
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
        });
      },    
    },
  };

  const ChannelList = {
    template: '#channel-list',
    computed: {
      channels() {
        return this.$root.$data.channels;
      },
    },
    mounted() {
      if (this.channels.length === 0) {
        this.refresh();
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
        fetchApi('/api/channel', GET, (data) => {
          this.$root.$data.channels = data;
        });
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
        this.$router.go(-1);
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
      props: ['item', 'video'],
      template: '#video-detail-item',
      emits: ['open-action-sheet'],
      methods: {
        openActionSheet(item, video) {
          this.$emit('open-action-sheet', item);
        },
      }
    };

    const VideoActionSheet = {
      props: ['video', 'item', 'actionSheetVisible'],
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
          const history = this.$router.history;
          if (history && history.length > 1) {
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
              ons.notification.toast('Ссылка скрпирована', { timeout: 5000 });
              this.actionSheetVisible = false;
            }); 
          }
          this.actionSheetVisible = false;
        },
        videoDownload() {
          fetchApi(`/api/video/${this.selectedVideo.id}/download`, (data) => {
            ons.notification.toast('Ссылка отправлена в ваш чат с ботом', { timeout: 5000 });
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
        tgWebApp.ready();
        tgWebApp.disableVerticalSwipes();
        tgWebApp.expand();
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