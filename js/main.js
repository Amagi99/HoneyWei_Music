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
    // 动画播放状态
    isPlaying: false,
    // 遮罩层的显示状态
    isShow: false,
    // mv地址
    mvUrl: "",
    // 当前播放歌曲信息
    currentMusic: {
      name: '',
      singer: ''
    },
    // 歌词数组
    lyricList: [],
    // 当前歌词索引
    currentLyricIndex: -1,
    // 原始歌词
    rawLyric: ''
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
      // 从音乐列表中查找当前歌曲信息
      var currentSong = null;
      for(var i = 0; i < that.musicList.length; i++) {
        if(that.musicList[i].id == musicId) {
          currentSong = that.musicList[i];
          break;
        }
      }
      
      // 设置当前歌曲信息
      if(currentSong) {
        that.currentMusic = {
          name: currentSong.name || '未知歌曲',
          singer: currentSong.singer || (currentSong.artists && currentSong.artists[0] ? currentSong.artists[0].name : '未知歌手')
        };
      }
      
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
            // 解析歌词并设置
            that.parseLyric(response.data.lyric || '');
          }
        },
        function(err) {
          console.error('获取音乐信息失败:', err);
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
    // 解析歌词
    parseLyric: function(lyric) {
      if (!lyric) {
        this.lyricList = [{ text: '暂无歌词' }];
        this.currentLyricIndex = -1;
        return;
      }
      
      const lyricArray = [];
      // 匹配歌词行
      const reg = /\[([^\]]+)\]([^\[]*)/g;
      let match;
      
      // 清空原始歌词
      this.rawLyric = lyric;
      
      // 解析歌词行
      while ((match = reg.exec(lyric)) !== null) {
        const timeStr = match[1];
        const text = match[2].trim();
        
        if (text) {
          // 解析时间
          const timeArray = timeStr.split(':');
          let seconds;
          if (timeArray.length === 2) {
            seconds = parseFloat(timeArray[0]) * 60 + parseFloat(timeArray[1]);
          } else {
            seconds = 0;
          }
          
          lyricArray.push({
            time: seconds,
            text: text
          });
        }
      }
      
      // 按时间排序
      lyricArray.sort((a, b) => a.time - b.time);
      this.lyricList = lyricArray;
      this.currentLyricIndex = -1;
    },
    // 更新当前歌词索引
    updateLyric: function() {
      const currentTime = this.$refs.audio.currentTime;
      
      // 找到当前时间对应的歌词索引
      for (let i = this.lyricList.length - 1; i >= 0; i--) {
        if (currentTime >= this.lyricList[i].time) {
          if (this.currentLyricIndex !== i) {
            this.currentLyricIndex = i;
            // 自动滚动到当前歌词
            this.scrollToCurrentLyric();
          }
          break;
        }
      }
    },
    // 滚动到当前歌词
    scrollToCurrentLyric: function() {
      if (this.currentLyricIndex >= 0 && this.$refs.lyric_list) {
        const lyricList = this.$refs.lyric_list;
        const currentLine = lyricList.children[this.currentLyricIndex];
        if (currentLine) {
          // 计算滚动位置，使当前歌词居中
          const scrollTop = currentLine.offsetTop - lyricList.clientHeight / 2 + currentLine.clientHeight / 2;
          lyricList.scrollTop = scrollTop;
        }
      }
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
  },
  
  // 组件挂载后
  mounted: function() {
    // 为音频元素添加事件监听
    const audio = this.$refs.audio;
    if (audio) {
      audio.addEventListener('timeupdate', this.updateLyric);
    }
  }
});

// 处理音频元素加载完成事件
document.addEventListener('DOMContentLoaded', function() {
  const audio = document.querySelector('.myaudio');
  if (audio) {
    audio.addEventListener('loadedmetadata', function() {
      // 元数据加载完成后重置歌词索引
      if (app) {
        app.currentLyricIndex = -1;
      }
    });
  }
});
