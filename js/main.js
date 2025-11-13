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
    rawLyric: '',
    // 当前播放的歌曲索引
    currentIndex: -1,
    // 进度条相关
    currentTimeText: '00:00',
    durationText: '00:00',
    progressWidth: '0%',
    // 音量控制相关
    volumeWidth: '80%',
    isMuted: false,
    volumeTimer: null
  },
  methods: {
    // 歌曲搜索
    searchMusic: function() {
      if (!this.query) {
          return
      }
      var that = this;
      axios.get("https://api.kxzjoker.cn/api/163_search?name=" + encodeURIComponent(this.query) + "&limit=50").then(
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
          that.currentIndex = i;
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
      
      // 设置加载超时检测
      that.setLoadTimeout();
      
      // 使用163_music API获取完整的音乐信息
      const musicUrl = 'https://y.music.163.com/m/song?id=' + musicId;
      axios.get("https://api.kxzjoker.cn/api/163_music?url=" + encodeURIComponent(musicUrl) + "&level=standard&type=json").then(
        function(response) {
          console.log('音乐信息响应:', response.data);
          if (response.data && response.data.status === 200 && response.data.url) {
            // 设置歌曲URL
            that.musicUrl = response.data.url;
            // 设置封面
            that.musicCover = response.data.pic;
            // 解析歌词并设置
            that.parseLyric(response.data.lyric || '');
          } else {
            console.error('获取到的音乐资源无效，自动切换到下一首');
            that.playNextSong();
          }
        },
        function(err) {
          console.error('获取音乐信息失败:', err);
          that.playNextSong();
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
    
    // 更新进度条
    updateProgressBar: function() {
      if (!this.$refs.audio) return;
      
      const audio = this.$refs.audio;
      const currentTime = audio.currentTime;
      const duration = audio.duration || 0;
      
      // 更新时间文本
      this.currentTimeText = this.formatTime(currentTime);
      this.durationText = this.formatTime(duration);
      
      // 更新进度条宽度
      if (duration > 0) {
        this.progressWidth = (currentTime / duration * 100) + '%';
      }
    },
    
    // 格式化时间
    formatTime: function(seconds) {
      if (isNaN(seconds) || seconds < 0) return '00:00';
      
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      
      return (
        (minutes < 10 ? '0' + minutes : minutes) + 
        ':' + 
        (remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds)
      );
    },
    
    // 更新播放进度
    updateProgress: function(event) {
      if (!this.$refs.audio) return;
      
      const audio = this.$refs.audio;
      const progressBar = event.currentTarget;
      const rect = progressBar.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const percentage = clickX / rect.width;
      
      const newTime = percentage * audio.duration;
      audio.currentTime = newTime;
      this.updateProgressBar();
    },
    
    // 切换静音状态
    toggleMute: function() {
      if (!this.$refs.audio) return;
      
      const audio = this.$refs.audio;
      this.isMuted = !this.isMuted;
      audio.muted = this.isMuted;
      
      // 更新音量条显示
      if (this.isMuted) {
        this.volumeWidth = '0%';
      } else {
        this.volumeWidth = (audio.volume * 100) + '%';
      }
    },
    
    // 更新音量
    updateVolume: function(event) {
      if (!this.$refs.audio) return;
      
      const audio = this.$refs.audio;
      const volumeBar = event.currentTarget;
      const rect = volumeBar.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      let percentage = clickX / rect.width;
      
      // 限制范围在0-1之间
      percentage = Math.max(0, Math.min(1, percentage));
      
      audio.volume = percentage;
      this.volumeWidth = (percentage * 100) + '%';
      
      // 如果之前是静音状态，取消静音
      if (this.isMuted) {
        this.isMuted = false;
        audio.muted = false;
      }
    },
    
    // 播放上一首歌曲
    playPrevSong: function() {
      if (this.musicList.length > 0) {
        // 计算上一首歌曲的索引，如果是第一首，则播放最后一首
        let prevIndex = this.currentIndex - 1;
        if (prevIndex < 0) {
          prevIndex = this.musicList.length - 1;
        }
        // 播放上一首歌曲
        this.playMusic(this.musicList[prevIndex].id);
      }
    },
    
    // 切换播放和暂停状态
    togglePlay: function() {
      if (!this.$refs.audio) return;
      
      const audio = this.$refs.audio;
      if (this.isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
    },
    // 滚动到当前歌词
    scrollToCurrentLyric: function() {
      if (this.currentLyricIndex >= 0 && this.$refs.lyric_list) {
        const lyricList = this.$refs.lyric_list;
        const currentLine = lyricList.children[this.currentLyricIndex];
        if (currentLine) {
          // 计算滚动位置，使当前歌词居中
          let scrollTop = currentLine.offsetTop - lyricList.clientHeight / 2 + currentLine.clientHeight / 2;
          
          // 确保滚动位置不会让歌词超出可视区域的底部
          // 计算最大滚动值
          const maxScrollTop = lyricList.scrollHeight - lyricList.clientHeight;
          
          // 如果计算出的滚动位置大于最大滚动值，则使用最大滚动值
          if (scrollTop > maxScrollTop) {
            scrollTop = maxScrollTop;
          }
          
          // 确保滚动位置不为负数
          if (scrollTop < 0) {
            scrollTop = 0;
          }
          
          lyricList.scrollTop = scrollTop;
        }
      }
    },
    // 播放下一首歌曲
  playNextSong: function() {
    if (this.musicList.length > 0) {
      // 计算下一首歌曲的索引，如果是最后一首，则播放第一首
      let nextIndex = this.currentIndex + 1;
      if (nextIndex >= this.musicList.length) {
        nextIndex = 0;
      }
      // 播放下一首歌曲
      this.playMusic(this.musicList[nextIndex].id);
    }
  },
  
  // 实现下载歌曲的功能
   downloadMusic: function() {
     // 获取当前播放的音频源
     const audioSource = this.$refs.audio.src;
     if (!audioSource) {
       alert('没有可下载的音频');
       return;
     }
     
     // 从当前歌曲列表获取歌曲名称
     const currentSongName = this.musicList[this.currentIndex] ? 
       this.musicList[this.currentIndex].name : 'audio';
     
     try {
       // 尝试使用Fetch API和Blob进行下载，这对大多数资源类型都有效
       fetch(audioSource)
         .then(response => {
           if (!response.ok) {
             throw new Error('网络响应不正常');
           }
           return response.blob();
         })
         .then(blob => {
           // 创建Blob URL
           const blobUrl = URL.createObjectURL(blob);
           
           // 创建下载链接
           const downloadLink = document.createElement('a');
           downloadLink.href = blobUrl;
           downloadLink.download = currentSongName + '.mp3';
           
           // 触发下载
           document.body.appendChild(downloadLink);
           downloadLink.click();
           
           // 清理
           document.body.removeChild(downloadLink);
           // 释放Blob URL
           setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
           
           console.log('下载歌曲:', currentSongName);
         })
         .catch(error => {
           console.error('下载失败:', error);
           // 降级方案：如果Fetch失败，尝试原始方式
           const downloadLink = document.createElement('a');
           downloadLink.href = audioSource;
           downloadLink.download = currentSongName + '.mp3';
           // 添加target="_blank"以防止页面跳转
           downloadLink.target = '_blank';
           document.body.appendChild(downloadLink);
           downloadLink.click();
           document.body.removeChild(downloadLink);
         });
     } catch (error) {
       console.error('下载过程中出现错误:', error);
       alert('下载失败，请稍后重试');
     }
   },
    // 处理音频错误，播放失败时自动切换到下一首
    handleAudioError: function() {
      console.error('音频播放失败，自动切换到下一首');
      // 清除超时定时器
      this.clearLoadTimeout();
      this.playNextSong();
    },
    
    // 设置加载超时检测
    setLoadTimeout: function() {
      // 清除可能存在的旧定时器
      this.clearLoadTimeout();
      // 设置3秒超时定时器
      var that = this;
      this.loadTimeout = setTimeout(function() {
        console.error('音频加载超时（3秒），自动切换到下一首');
        that.playNextSong();
      }, 3000);
    },
    
    // 清除加载超时定时器
    clearLoadTimeout: function() {
      if (this.loadTimeout) {
        clearTimeout(this.loadTimeout);
        this.loadTimeout = null;
      }
    }
  },
  // 组件挂载后
  mounted: function() {
    // 为音频元素添加事件监听
    const audio = this.$refs.audio;
    var that = this;
    if (audio) {
      audio.addEventListener('timeupdate', function() {
        that.updateLyric();
        that.updateProgressBar();
      });
      audio.addEventListener('ended', this.playNextSong);
      
      // 监听音频可以播放事件，清除超时定时器
      audio.addEventListener('canplay', function() {
        that.clearLoadTimeout();
        that.updateProgressBar();
      });
      
      // 监听音频加载数据事件，清除超时定时器
      audio.addEventListener('loadeddata', function() {
        that.clearLoadTimeout();
        that.updateProgressBar();
        // 初始化音量
        audio.volume = 0.8;
      });
      
      // 监听音频元数据加载完成事件
      audio.addEventListener('loadedmetadata', function() {
        that.updateProgressBar();
        if (app) {
          app.currentLyricIndex = -1;
        }
      });
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
