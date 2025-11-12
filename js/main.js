var app = new Vue({
  el: "#player",
  data: {
    // 查询关键字
    query: "",
    // 歌曲数组
    musicList: [],
    // 歌曲地址
    musicUrl: "",
    // 歌曲封面
    musicCover: "",
    // 歌曲评论
    hotComments: [],
    // 动画播放状态
    isPlaying: false,
    // 遮罩层的显示状态
    isShow: false,
    // mv地址
    mvUrl: ""
  },
  methods: {
    // 歌曲搜索
    searchMusic: function() {
      if (!this.query) {
          return
      }
      var that = this;
      axios.get("https://api.kxzjoker.cn/api/163_search?name=" + encodeURIComponent(this.query) + "&limit=10").then(
        function(response) {
          // 检查响应格式并保存内容
          if (response.data && response.data.data) {
              that.musicList = response.data.data;
          } else {
              that.musicList = [];
          }
        },
        function(err) {
          console.error('搜索歌曲失败:', err);
          that.musicList = [];
        }
      );
      // 清空搜索
      this.query = '';
    },
    // 歌曲播放
      playMusic: function(musicId) {
        var that = this;
        // 使用163_music API获取完整的音乐信息
        const musicUrl = 'https://y.music.163.com/m/song?id=' + musicId;
        axios.get("https://api.kxzjoker.cn/api/163_music?url=" + encodeURIComponent(musicUrl) + "&level=standard&type=json").then(
          function(response) {
            console.log('音乐信息响应:', response.data);
            if (response.data && response.data.status === 200) {
              // 设置歌曲URL
              that.musicUrl = response.data.url;
              // 设置封面
              that.musicCover = response.data.pic;
            }
          },
          function(err) {
            console.error('获取音乐信息失败:', err);
          }
        );
        
        // 仍然尝试获取评论信息，使用独立的API
        axios.get("https://api.kxzjoker.cn/api/163_comment?id=" + musicId).then(
          function(response) {
            if (response.data && response.data.hotComments) {
              that.hotComments = response.data.hotComments;
            }
          },
          function(err) {
            console.error('获取评论失败:', err);
          }
        );
      },
    // 歌曲播放
    play: function() {
      // console.log("play");
      this.isPlaying = true;
    },
    // 歌曲暂停
    pause: function() {
      // console.log("pause");
      this.isPlaying = false;
    },
    // 播放mv
    playMV: function(mvid) {
      var that = this;
      axios.get("https://api.kxzjoker.cn/api/163_mv?id=" + mvid).then(
        function(response) {
          // console.log(response);
          console.log(response.data.data.url);
          that.isShow = true;
          that.mvUrl = response.data.data.url;
        },
        function(err) {}
      );
    },
    // 隐藏
    hide: function() {
      this.isShow = false;
    }
  }
});
