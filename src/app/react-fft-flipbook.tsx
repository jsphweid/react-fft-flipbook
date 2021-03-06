import * as React from 'react'
import FileLoader from './file-loader/file-loader'
import Visualization from './visualization/visualization'
import AudioFile from './audio-engine/audio-file'
import AudioGraph from './audio-engine/audio-graph'
import Navigation from './navigation/navigation'
import { AudioFileStatus, AudioGraphStatus } from './common/types'

export interface FFTFlipBookProps {
    width: number
    height: number
}

export interface FFTFlipBookState {
    audioGraph: AudioGraph
    readOnlyBufferIndex: number
    audioFileStatus: AudioFileStatus
    audioGraphStatus: AudioGraphStatus
    normalVisualizationStyle: boolean
    isLooping: boolean
}

export default class FFTFlipBook extends React.Component<FFTFlipBookProps, FFTFlipBookState> {

    audioFile: AudioFile

    constructor(props: FFTFlipBookProps) {

        super(props)

        this.state = {
            audioGraph: null,
            readOnlyBufferIndex: 0,
            audioFileStatus: AudioFileStatus.Uninitiated,
            audioGraphStatus: AudioGraphStatus.Disconnected,
            normalVisualizationStyle: true,
            isLooping: false
        }

    }

    componentDidMount() {
        const audioGraph: AudioGraph = new AudioGraph(this.updateReadOnlyBufferIndex.bind(this))
        this.setState({ audioGraph })
    }

    updateReadOnlyBufferIndex = (newIndex: number): void => {
        this.setState({ readOnlyBufferIndex: newIndex })
    }

    handleTogglePlay = (): void => {
        switch (this.state.audioGraphStatus) {
            case AudioGraphStatus.Disconnected:
                return this.setState({ audioGraphStatus: this.state.audioGraph.connectNodes() })
            case AudioGraphStatus.Connected:
                return this.setState({ audioGraphStatus: this.state.audioGraph.disconnectAllNodes() })
        }
    }

    handleResetGraphToDefaultState = (): void => {
        this.updateReadOnlyBufferIndex(0)
        this.state.audioGraph.resetGraphToDefaultState()
        this.setState({ audioGraphStatus: AudioGraphStatus.Disconnected })
    }

    handleLoadFile = (file: any): void => {
        console.log('file', file)        
        this.setState({ audioFileStatus: AudioFileStatus.Loading })
        const { audioGraph } = this.state
        this.handleResetGraphToDefaultState()
        audioGraph.audioContext.decodeAudioData(file, (buffer) => {
            const audioFile = new AudioFile(this.state.audioGraph, buffer, AudioGraph.BUFFER_SIZE, 0)
            this.audioFile = audioFile
            audioFile.process()
            audioGraph.buildNodes(audioFile)
            this.setState({ audioFileStatus: AudioFileStatus.Ready })

        })
    }

    handleToggleIsLooping = (): void => {
        const newIsLooping: boolean = !this.state.isLooping
        this.state.audioGraph.setReadOnlyIsLooping(newIsLooping)
        this.setState({ isLooping: newIsLooping })
    }

    renderButtonsAndDropzone = (): JSX.Element => {
        const { audioGraph, normalVisualizationStyle, audioFileStatus } = this.state
        
        const fileLoader: JSX.Element =
            <FileLoader
                key={1}
                canLoadFile={audioGraph !== null && audioFileStatus !== AudioFileStatus.Loading}
                handleLoadFile={this.handleLoadFile}
                normalVisualizationStyle={normalVisualizationStyle}
            />

        const visualStyleChanger: JSX.Element =
            <button
                className={`ffb-button ${normalVisualizationStyle ? 'ffb-styleChanger-topRight' : 'ffb-styleChanger-bottomLeft'}`}
                key={2}
                onClick={() => this.setState({ normalVisualizationStyle: !this.state.normalVisualizationStyle })}
            >
                {normalVisualizationStyle ? 'Circle' : 'Normal'}
            </button>
        
        const navigation: JSX.Element =
            <Navigation
                key={3}
                audioFileStatus={audioFileStatus}
                audioGraphStatus={this.state.audioGraphStatus}
                handleIncrement={(num: number) => audioGraph.updateBufferIndex(num, this.audioFile)}
                togglePlay={this.handleTogglePlay.bind(this)}
                isLooping={this.state.isLooping}
                toggleIsLooping={this.handleToggleIsLooping.bind(this)}
                normalVisualizationStyle={this.state.normalVisualizationStyle}
                readOnlyBufferIndex={this.state.readOnlyBufferIndex}
            />

        return normalVisualizationStyle
            ? <div>{[navigation, fileLoader, visualStyleChanger]}</div>
            : <div>{[visualStyleChanger, fileLoader, navigation]}</div>
    }

    render() {
        const spectrum: Float32Array = this.audioFile ? this.audioFile.chunkedFfts[this.state.audioGraph.getBufferIndex()] : new Float32Array([])

        if (!this.state.audioGraph) {
            return (
                <div>loading audio graph</div>
            )
        }

        return (
            <div className="ffb" style={{ width: `${this.props.width}px`, height: `${this.props.height}px` }}>
                <Visualization
                    spectrum={spectrum}
                    width={this.props.width}
                    height={this.props.height}
                    normalVisualizationStyle={this.state.normalVisualizationStyle}
                />
                {this.renderButtonsAndDropzone()}
            </div>
        )

    }

}
