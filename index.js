'use strict';
import React, { Component } from 'react';
import {
    View,
    ListView,
    Text,
    Dimensions,
    StyleSheet,
    TouchableOpacity,
    Image,
    DeviceEventEmitter,
    Platform,
    ActivityIndicator,
    PanResponder,
    Animated,
    BackHandler
} from 'react-native';
import _ from 'lodash';
import Video from 'react-native-video';
import Orientation from 'react-native-orientation';
import PropTypes from 'prop-types';
let windowSize = Dimensions.get('window');
import Slider from '@react-native-community/slider';
export class MyVideo extends Component {

    static propTypes =
        {
            seekEnable: PropTypes.bool,
            lockOrientation: PropTypes.bool,
            isBuy:PropTypes.bool,
            limitSeconds:PropTypes.number
        };
    static defaultProps = {
        seekEnable: true,
        lockOrientation: false,
        isBuy:false,
        limitSeconds:60*5
    };

    // 构造
    constructor(props) {
        super(props);
        // 初始状态
        this.animValue = new Animated.Value(0);
        this.state = {
            paused: true,
            showToolBar: true,
            currentTime: 0,
            seeking: false,
            seekerFillWidth: 0,
            seekerOffset: 0,
            duration: 0,
            loading: false,
            isFullScreen: false,
        };
    }

    componentDidMount() {
        if (Platform.OS === 'android') {
            this.hardwareBackPress = BackHandler.addEventListener('hardwareBackPress', this.androidBackAction);
            setTimeout(()=>{
                this.setState({paused:false})
            },1000);
        }
    }




    androidBackAction = ()=>{
        if(this.state.isFullScreen)
        {
            this.onBack();
            return true;
        }
        else
        {
            return false;
        }

    }


    setControlTimeout() {
        this.clearControlTimeout();
        this.timer = setTimeout(
            () => {
                this.hiddenToolBar();
            },
            6000
        );
    }

    clearControlTimeout() {
        this.timer && clearTimeout(this.timer);
    }


    hiddenToolBar() {
        Animated.spring(
            this.animValue,
            {
                toValue: 1,
                friction: 8,
            }
        ).start();
        this.setState({ showToolBar: false });
    }

    showToolBar() {
        Animated.spring(
            this.animValue,
            {
                toValue: 0,
                friction: 8,
            }
        ).start();
        this.setState({ showToolBar: true });
    }

    ShowOrHideToolBar = ()=> {
        this.setControlTimeout();
        if (!this.state.showToolBar) {
            this.setControlTimeout();
            this.showToolBar();

        }
        else {
            this.hiddenToolBar();
        }
    }

    onPause = () => {
        if (!this.props.isBuy && this.state.currentTime >= this.props.limitSeconds)
        {

            return;
        }

        if (!this.state.loading) {
            this.setControlTimeout();
            if (this.state.paused) {
                if (this.props.onPlay) {
                    this.props.onPlay();
                }

            }
            this.setState({ paused: !this.state.paused });

        }
    };

    onFullScreen = () => {
        if (this.props.onFullScreen) {
            this.props.onFullScreen(!this.state.isFullScreen);
        }

        this.setControlTimeout();
        if (this.state.isFullScreen) {
            Orientation.lockToPortrait();
            this.setState({ isFullScreen: false });
        }
        else {
            Orientation.lockToLandscapeRight();
            this.setState({ isFullScreen: true });
        }



    };

    onBack = () => {
        this.setControlTimeout();
        if (this.state.isFullScreen) {
            this.onFullScreen();
        }
        else {
            if (this.props.onBack) {
                this.props.onBack();
            }
        }
    };


    componentWillMount() {
        this.setControlTimeout();
    }

    componentWillUnmount() {
        // 如果存在this.timer，则使用clearTimeout清空。
        // 如果你使用多个timer，那么用多个变量，或者用个数组来保存引用，然后逐个clear
        this.timer && clearTimeout(this.timer);
        if (Platform.OS === 'android')
        {
            this.hardwareBackPress.remove();
        }

    }



    _onLoad(data = {}) {
        let duration = data.duration;
        if (this.props.onLoad) {
            this.props.onLoad(duration);
        }
        this.setState({ loading: false, duration });
    }

    onLoadStart() {
        let state = this.state;
        state.currentTime = 0;
        state.loading = true;
        state.paused = true;
        this.setState(state);
    }


    _onProgress(data = {}) {
        if (!this.state.seeking)
        {
            let state = this.state;
            state.currentTime = data.currentTime;
            if (!this.props.isBuy && data.currentTime >= this.props.limitSeconds)
            {
                this.setState({paused:true});
                return;
            }

            this.setState(state);
        }

    }

    onEnd() {
        if (this.props.repeat) {

            return;
        }


        this.setState({ paused: true },()=>{this.seekTo(0);});


        if (this.props.onEnd) {
            if (this.state.isFullScreen) {
                if (!this.props.lockOrientation) {
                    Orientation.lockToPortrait();
                }

                this.setState({ isFullScreen: false });

                if (this.props.onFullScreen) {
                    this.props.onFullScreen();
                }

            }

            this.props.onEnd();
        }
    }

    /**
     * Calculate the time to show in the timer area
     * based on if they want to see time remaining
     * or duration. Formatted to look as 00:00.
     */
    calculateTime(time) {
        return `${ this.formatTime(time) }`;
    }

    /**
     * Format a time string as mm:ss
     *
     * @param {int} time time in milliseconds
     * @return {string} formatted time string in mm:ss format
     */
    formatTime(time = 0) {
        const symbol = this.state.showRemainingTime ? '-' : '';
        time = Math.min(
            Math.max(time, 0),
            this.state.duration
        );
        const minutes = parseInt(time / 60);
        const seconds = parseInt(time % 60);

        const formattedMinutes = _.padStart(minutes.toFixed(0), 2, 0);
        const formattedSeconds = _.padStart(seconds.toFixed(0), 2, 0);

        return `${ symbol }${ formattedMinutes }:${ formattedSeconds }`;
    }



    /**
     * Seek to a time in the video.
     *
     * @param {float} time time to seek to in ms
     */
    seekTo(time = 0) {
        let state = this.state;
        state.seeking = false;
        state.currentTime = time;

        this.setState(state,()=>{
            let {limitSeconds,isBuy} = this.props;
            if (!isBuy && time >= limitSeconds)
            {
                this.player.seek(limitSeconds);
                this.setState({currentTime:limitSeconds,paused:true})
            }
            else
            {
                this.player.seek(time);
            }
        });
    }

    /**
     * Render the seekbar and attach its handlers
     */


    renderSeekbar(){
        return(
            <Slider
                style={{flex: 1, height: 10, marginHorizontal:10}}
                maximumTrackTintColor={'#cccccc'}
                minimumTrackTintColor={'#9E76D4'}
                thumbImage={require('./img/videoSliderThumb.png')}
                thumbTintColor = {Platform.OS === 'android'?'#9E76D4':null}
                value={this.state.currentTime}
                minimumValue={0}
                maximumValue={this.state.duration}
                onValueChange={(currentTime) => { this.setState({seeking:true,currentTime}) }}
                onSlidingComplete={(value) => { //用户完成更改值时调用的回调（例如，当滑块被释放时）
                    value = Math.ceil(value);
                    this.seekTo(value)

                }}
            />
        )
    }

    renderTimer() {
        return (<Text style={{
            marginLeft: 5, marginRight: 5, minWidth: 40, fontSize: 13, backgroundColor: 'transparent',
            color: '#FFF',
        }} allowFontScaling={false}>
            {this.calculateTime(this.state.currentTime)}/{this.calculateTime(this.state.duration)}
        </Text>);
    }

    renderTimer2() {
        return (<Text style={{
            marginLeft: 5, fontSize: 13, backgroundColor: 'transparent',
            color: '#FFF',
        }} allowFontScaling={false}>
            {this.calculateTime(this.state.duration)}
        </Text>);
    }


    renderPlayPause() {
        if (!this.state.paused) {
            return (
                <TouchableOpacity style={styles.button} onPress={this.onPause}>
                    <Image source={require('./img/videoSmallStart.png')}>
                    </Image>
                </TouchableOpacity>
            );
        }
        else {
            return (
                <TouchableOpacity style={styles.button} onPress={this.onPause}>
                    <Image source={require('./img/videoSmallPause.png')}>
                    </Image>
                </TouchableOpacity>
            );
        }

    }

    renderFull() {

        return (
            <TouchableOpacity style={styles.button} onPress={this.onFullScreen}>
                <Image source={require('./img/videoFullScreenIcon.png')} style={{ width: 24, height: 24, marginRight: 2 }}>
                </Image>
            </TouchableOpacity>
        );
    }


    renderBottom() {
        return (<Animated.View style={{
            position: 'absolute', left: 0, bottom: this.animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -60],
            }), right: 0, height: 60,backgroundColor:'rgba(0,0,0,0.6)'
        }}>
            {this.renderSeekbar()}
            <View style={{flexDirection: 'row', flex: 2, alignItems: 'center' }}>
                {this.renderPlayPause()}
                {this.renderTimer()}
                <View style={{flex:1}}/>
                {this.state.isFullScreen?null:this.renderFull()}
            </View>

        </Animated.View>);
    }

    renderTop() {
        return (
            <Animated.View style={{
                position: 'absolute', left: 0, top: this.animValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -40],
                }), right: 0, height: 40
            }}>
                <TouchableOpacity style={{ width: 50, height: 40 }} onPress={this.onBack}>
                    <Image source={require('./img/navigationBar_back_icon.png')}
                           style={{ width: 20, height: 20, marginLeft: 15, marginTop: 20 }}>
                    </Image>
                </TouchableOpacity>
            </Animated.View>
        );

    }

    renderLoad() {
        if (this.props.url == null) {
            let bgStyle = this.props.style != null ? this.props.style : {
                width: windowSize.width,
                height: (512 / 750) * windowSize.width
            };

            return (<TouchableOpacity
                style={{
                    position: 'absolute', left: 0, right: 0,
                    bottom: 0, top: 0, alignItems: 'center', justifyContent: 'center'
                }}
                activeOpacity={1}
                onPress={this.ShowOrHideToolBar}>

                <Image source={require('./img/noVideo.png')} style={bgStyle}/>
            </TouchableOpacity>);
        }
        else {
            if (this.state.loading) {
                return (
                    <TouchableOpacity
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            top: 0,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgb(46,56,66)'
                        }}
                        activeOpacity={1}
                        onPress={this.ShowOrHideToolBar}>

                        <ActivityIndicator
                            color="white"
                            size="large"
                        />
                    </TouchableOpacity>

                );
            }
            else {
                if (this.state.paused)
                {
                    return (<TouchableOpacity
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            top: 0,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        activeOpacity={1}
                        onPress={this.ShowOrHideToolBar}>
                        <TouchableOpacity style={{ width: 50, height: 50 }}
                                          onPress={this.onPause}>
                            <Image source={require('./img/videoCenterPause.png')} style={{ width: 50, height: 50 }}/>
                        </TouchableOpacity>
                    </TouchableOpacity>);
                }
                else {
                    return null;
                }

            }
        }

    }

    onReadyForDisplay = () => {
        // Android 在 onLoad 的时候操作这个
        if (Platform.OS === 'ios') {
            let state = this.state;
            this.state.loading = false;
            this.setState(state);
        }
    };

    renderVideo() {
        let videoView = null;
        if (this.props.url != null) {
            videoView = <Video
                ref={(ref) => {
                    this.player = ref;
                }}
                source={{ uri: this.props.url }} // Can be a URL or a local file.
                rate={1.0}                   // 0 is paused, 1 is normal.
                volume={1.0}                 // 0 is muted, 1 is normal.
                muted={false}                // Mutes the audio entirely.
                paused={this.state.paused}               // Pauses playback entirely.
                resizeMode="cover"           // Fill the whole screen at aspect ratio.
                repeat={false}                // Repeat forever.
                onProgress={this._onProgress.bind(this)}
                onLoad={this._onLoad.bind(this)}
                onEnd={this.onEnd.bind(this)}
                onLoadStart={this.onLoadStart.bind(this)}
                onReadyForDisplay={this.onReadyForDisplay}
                // Callback when video cannot be loaded
                style={styles.backgroundVideo}/>;
        }

        return (<TouchableOpacity style={{ flex: 1 }}
                                  activeOpacity={1}
                                  onPress={this.ShowOrHideToolBar}
        >
            {videoView}

        </TouchableOpacity>);
    }

    render() {
        var bgStyle = this.props.style != null ? this.props.style : {
            width: windowSize.width,
            height: (512 / 750) * windowSize.width
        };

        return (
            <View style={this.state.isFullScreen ? {
                width: windowSize.height,
                height: windowSize.width,
                backgroundColor: 'black'
            } : bgStyle}>
                <View style={[{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    right:0,
                    bottom:0,
                    overflow: 'hidden',
                    zIndex: 100,
                }]}>
                    {this.renderVideo()}
                    {this.renderLoad()}
                    {this.state.isFullScreen?this.renderTop():null}
                    {this.renderBottom()}
                </View>
            </View>

        );
    }
}


const styles = StyleSheet.create({
    backgroundVideo: {
        flex: 1,
    },
    cell: {
        width: windowSize.width,
        height: 131,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    content: {
        flexDirection: 'row',
        height: 120,
        width: windowSize.width,
        alignItems: 'center',
    },
    button: {
        width: 50,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center'
    },
    centering:
        {
            alignItems: 'center',
            justifyContent: 'center',
            padding: 8,
        },
    track: {
        alignSelf: 'stretch',
        justifyContent: 'center',
        borderRadius: 2,
        height: 4,
        marginLeft: 5,
        marginRight: 5,
    },
    fill: {
        alignSelf: 'flex-start',
        height: 4,
        width: 1,
        borderRadius: 2,
    },
    handle: {
        position: 'absolute',
        height: 40,
        width: 40,
    },
    circle: {
        marginTop: 9,
        marginLeft: 3,
        borderRadius: 3,
        height: 6,
        width: 6,
    },
});
