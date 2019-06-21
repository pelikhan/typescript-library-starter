
import * as React from "react";

// renderer
export let makecodeUrl: string;
export let lang: string = "en";

interface RenderBlocksRequestMessage {
    type: "renderblocks",
    id: string;
    code: string;
    options?: {
        package?: string;
        snippetMode?: boolean;
    }
}

interface RenderBlocksResponseMessage {
    source: "makecode",
    type: "renderblocks",
    id: string;
    svg?: string;
    width?: number;
    height?: number;
}

interface RenderBlocksRequentResponse {
    req: RenderBlocksRequestMessage,
    cb: (resp: RenderBlocksResponseMessage) => void
}

let ready = false;
let nextRequest = 0;
const pendingRequests: {
    [index: string]: RenderBlocksRequentResponse
} = {};

function renderBlocks(req: RenderBlocksRequestMessage, cb: (resp: RenderBlocksResponseMessage) => void) {
    req.id = (nextRequest++) + "";
    console.log('render ' + req.id)
    pendingRequests[req.id] = { req, cb }
    if (ready)
        sendRequest(req);
}

function sendRequest(req: RenderBlocksRequestMessage) {
    const f = startRenderer();
    f.contentWindow.postMessage(req, makecodeUrl);
}

// listen for messages
function handleMessage(ev: MessageEvent) {
    let msg = ev.data;
    if (msg.source != "makecode") return;

    console.log(msg.type)
    switch (msg.type) {
        case "renderready":
            ready = true;
            Object.keys(pendingRequests).forEach(k => sendRequest(pendingRequests[k].req));
            break;
        case "renderblocks":
            const id = msg.id; // this is the id you sent
            const r = pendingRequests[id];
            if (!r) return;

            delete pendingRequests[id];
            r.cb(msg.data as RenderBlocksResponseMessage);
            break;
    }
}

function startRenderer(): HTMLIFrameElement {
    let f = document.getElementById("makecoderenderer") as HTMLIFrameElement;
    if (f) return f;

    window.addEventListener("message", handleMessage, false);

    f = document.createElement("iframe");
    f.id = "makecoderenderer";
    f.style.position = "absolute";
    f.style.left = "0";
    f.style.bottom = "0";
    f.style.width = "1px";
    f.style.height = "1px";
    f.src = `${makecodeUrl}/--docs?render=1&lang=${lang}`;
    document.body.appendChild(f);

    return f;
}

export interface MakeCodeSnippetProps {
    type?: string;
    code: string;
}

export interface MakeCodeSnippetState {
    svg?: string;
    width?: number;
    height?: number;
}

export class MakeCodeSnippet extends React.Component<MakeCodeSnippetProps, MakeCodeSnippetState> {

    constructor(props: MakeCodeSnippetProps) {
        super(props);
    }

    componentWillMount() {
        startRenderer();
    }

    componentWillReceiveProps(nextProps: MakeCodeSnippetProps) {
        if (this.props.type != nextProps.type ||
            this.props.code != nextProps.code) {
            // clear state and render again
            this.setState({ svg: undefined, width: undefined, height: undefined });
            renderBlocks(
                {
                    type: "renderblocks",
                    id: "",
                    code: nextProps.code
                },
                (resp) => {
                    this.setState({
                        svg: resp.svg,
                        width: resp.width,
                        height: resp.height
                    });
                }
            )
        }
    }

    render(): JSX.Element {
        const { svg, width, height } = this.state;

        if (!svg)
            return <div>rendering...</div>;
        else
            return <img src={svg} width={width} height={height} />
    }
}
