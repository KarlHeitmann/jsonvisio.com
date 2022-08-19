import React from "react";
import {
  ReactZoomPanPinchRef,
  TransformComponent,
  TransformWrapper,
} from "react-zoom-pan-pinch";
import { Canvas, EdgeData, ElkRoot, NodeData, NodeProps } from "reaflow";
import { CustomNode } from "src/components/CustomNode";
import { NodeModal } from "src/containers/Modals/NodeModal";
import { getEdgeNodes } from "src/containers/Editor/LiveEditor/helpers";
import { flattenTree, extractTree } from "src/utils/json-editor-parser";
import useConfig from "src/hooks/store/useConfig";
import styled from "styled-components";
import shallow from "zustand/shallow";

interface LayoutProps {
  mainTree: any;
  setMainTree: any;
  isWidget: boolean;
  openModal: () => void;
  setSelectedNode: (node: object) => void;
}

const StyledEditorWrapper = styled.div<{ isWidget: boolean }>`
  position: absolute;
  width: 100%;
  height: ${({ isWidget }) => (isWidget ? "100vh" : "calc(100vh - 36px)")};
  background: ${({ theme }) => theme.BACKGROUND_SECONDARY};

  :active {
    cursor: move;
  }

  rect {
    fill: ${({ theme }) => theme.BACKGROUND_NODE};
  }
`;

const MemoizedGraph = React.memo(function Layout({
  mainTree,
  setMainTree,
  isWidget,
  openModal,
  setSelectedNode,
}: LayoutProps) {
  const json = useConfig((state) => state.json);
  const [nodes, setNodes] = React.useState<NodeData[]>([]);
  const [edges, setEdges] = React.useState<EdgeData[]>([]);
  const [size, setSize] = React.useState({
    width: 2000,
    height: 2000,
  });

  const updateSetting = useConfig((state) => state.updateSetting);
  const [expand, layout] = useConfig(
    (state) => [state.settings.expand, state.settings.layout],
    shallow
  );

  React.useEffect(() => {
    let parsedJson = JSON.parse(json)
    if (!Array.isArray(parsedJson)) parsedJson = [parsedJson];
    // debugger
    const mt = extractTree(parsedJson);
    const flatTree = flattenTree(mt);
    const { nodes, edges } = getEdgeNodes(flatTree, expand);
    // debugger;

    setMainTree(mt);
    setNodes(nodes);
    setEdges(edges);
  }, [json, expand]);

  const onInit = (ref: ReactZoomPanPinchRef) => {
    updateSetting("zoomPanPinch", ref);
  };

  const onCanvasClick = () => {
    const input = document.querySelector("input:focus") as HTMLInputElement;
    if (input) input.blur();
  };

  const onLayoutChange = (layout: ElkRoot) => {
    if (layout.width && layout.height)
      setSize({ width: layout.width, height: layout.height });
  };

  const handleNodeClick = React.useCallback(
    (e: React.MouseEvent<SVGElement>, props: NodeProps) => {
      setSelectedNode(props.properties.text);
      debugger
      // if (navigationMode) {
        const subTree = searchSubTree(mainTree, props.id);
        if (subTree.length) {
          const flatTree = flattenTree(subTree)
          const { nodes, edges } = getEdgeNodes(flatTree, expand);
          setNodes(nodes);
          setEdges(edges);
        }
      // }
      // openModal();
    },
    [openModal, setSelectedNode]
  );

  const node = React.useCallback(
    (props) => (
      <CustomNode onClick={(e) => handleNodeClick(e, props)} {...props} />
    ),
    [handleNodeClick]
  );

  return (
    <StyledEditorWrapper isWidget={isWidget}>
      <TransformWrapper
        onInit={onInit}
        maxScale={1.8}
        minScale={0.4}
        initialScale={0.7}
        wheel={{
          step: 0.05,
        }}
      >
        <TransformComponent
          wrapperStyle={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
          }}
        >
          <Canvas
            nodes={nodes}
            edges={edges}
            maxWidth={size.width + 100}
            maxHeight={size.height + 100}
            direction={layout}
            key={layout}
            onLayoutChange={onLayoutChange}
            node={node}
            zoomable={false}
            readonly
          />
        </TransformComponent>
      </TransformWrapper>
    </StyledEditorWrapper>
  );
});

export const Graph = ({ isWidget = false }: { isWidget?: boolean }) => {
  const [isModalVisible, setModalVisible] = React.useState(false);
  const [selectedNode, setSelectedNode] = React.useState<object>({});
  const [mainTree, setMainTree] = React.useState([]);

  const openModal = React.useCallback(() => setModalVisible(true), []);

  return (
    <>
      <MemoizedGraph
        mainTree={mainTree}
        setMainTree={setMainTree}
        openModal={openModal}
        setSelectedNode={setSelectedNode}
        isWidget={isWidget}
      />
      {!isWidget && (
        <NodeModal
          selectedNode={selectedNode}
          visible={isModalVisible}
          closeModal={() => setModalVisible(false)}
        />
      )}
    </>
  );
};

const searchSubTree = (trees, id) => {
  for (let i=0; i<trees.length; i++) {
    let tree = trees[i];
    const cond = tree.id == id
    if (cond) return [tree];
  }
  for (let i=0; i<trees.length; i++) {
    let tree = trees[i];
    let result = searchSubTree(tree.children, id)
    if (result.length) return result
  }
  return []
}
