import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import ReactFamilyTree from 'react-family-tree';

import PopUp from './components/PopUp'

function App() {
    const [nodeToEdit, setNodeToEdit] = useState(null)
    const [nodes, setNodes] = useState([{ id: 'ROOT', gender: '', data: {}, parents: [], children: [], siblings: [], spouses: [] }])
    const [root, setRoot] = useState('ROOT')
    const relations = useRef([])

    const GetParents = (nodeList, currentNodeID) => {
        if (nodeList.some(nodeID => nodeID == currentNodeID))
            return
        nodeList.push(currentNodeID)
        let parents = relations.current.filter(relation => relation.childID == currentNodeID).map(relation => relation.parentID)
        var newNodes = parents.filter(parentID => !nodeList.some(nodeID => nodeID == parentID))
        newNodes.forEach(nodeID => GetParents(nodeList, nodeID))
    }

    const GetChildren = (nodeList, currentNodeID) => {
        if (nodeList.some(nodeID => nodeID == currentNodeID))
            return
        nodeList.push(currentNodeID)
        let children = relations.current.filter(relation => relation.parentID == currentNodeID).map(relation => relation.childID)
        var newNodes = children.filter(childID => !nodeList.some(nodeID => nodeID == childID))
        newNodes.forEach(nodeID => GetChildren(nodeList, nodeID))
    }

    const GetTreeSize = async (nodeID) => {
        try {
            let nodeList = []
            GetParents(nodeList, nodeID)
            GetChildren(nodeList, nodeID)
            return nodeList.length
        }
        catch (error) {
            console.log(error)
            return 0
        }
    }

    const SetTreeRoot = (nodeList) => {
        let rootID = nodeList.map(node => ({ node: node.id, treeSize: GetTreeSize(node.id) }))
            .reduce((prev, current) => (prev && prev.treeSize > current.treeSize) ? prev : current, 0).node
        setRoot(rootID)
    }

    const OpenPopUp = () => {
        document.getElementById('popup').style.display = 'flex';
    }

    const EditNode = (nodeID) => {
        setNodeToEdit(nodes.find(node => node.id == nodeID))
        OpenPopUp()
    }

    const AddOrUpdNode = (nodeData) => {
        let nodesCopy = nodes.map(node => node.data)
        let index = nodesCopy.findIndex(node => node?.ID === nodeData.node.ID)
        if (index === -1)
            nodesCopy.push(nodeData.node)
        else {
            nodesCopy[index] = nodeData.node
            relations.current = relations.current.filter(relation => relation.parentID !== nodeData.node.ID && relation.childID !== nodeData.node.ID)
        }

        nodeData.parents.map(parent => ({ parentID: parent.ID, childID: nodeData.node.ID }))
            .forEach(relation => relations.current.push(relation))
        nodeData.children.map(child => ({ parentID: nodeData.node.ID, childID: child.ID }))
            .forEach(relation => relations.current.push(relation))
        BuildTree(nodesCopy)
    }

    const DeleteNode = (nodeID) => {
        let nodesCopy = nodes.map(node => node.data)
        nodesCopy = nodesCopy.filter(node => node?.ID !== nodeID)
        relations.current = relations.current.filter(relation => relation.parentID !== nodeID && relation.childID !== nodeID)
        BuildTree(nodesCopy)
    }

    const GetNodes = async () => {
        try {
            var request = axios.create({
                baseURL: 'http://localhost:8000/node',
                params: {},
                headers: {}
            })
            var response = await request.get()
            return response.data
        } catch (error) {
            console.error('Error getting nodes: ', error)
            return []
        }
    }

    const GetRelations = async () => {
        try {
            var request = axios.create({
                baseURL: 'http://localhost:8000/relation',
                params: {},
                headers: {}
            })
            var response = await request.get()
            return response.data
        } catch (error) {
            console.error('Error getting relations: ', error)
            return []
        }
    }

    const BuildTree = (nodeList) => {
        let nodesTemp = []
        nodeList.forEach(node => {
            let parents = relations.current.filter(relation => relation.childID === node.ID).map(relation => ({ id: relation.parentID }))
            let children = relations.current.filter(relation => relation.parentID === node.ID).map(relation => ({ id: relation.childID }))
            nodesTemp.push({ id: node.ID, gender: node.gender, data: node, parents: parents, children: children, siblings: [], spouses: [] })
        })
        SetTreeRoot(nodesTemp)
        setNodes(nodesTemp)
    }

    const Init = async () => {
        let nodeList = await GetNodes()
        relations.current = await GetRelations()
        BuildTree(nodeList)
    }

    useEffect(() => {
        Init()
    }, [])

    return (
        <div>
            <div id='menu'>
                {nodes.map((node) => (
                    <div
                        className='menu_node'
                        onClick={() => setRoot(node.data.ID)}
                        style={{ background: root == node?.data?.ID ? '#db3434' : 'transparent' }}
                    >
                        {node?.data?.name} {node?.data?.surname} {root == node?.data?.ID ? '[root]' : ''}
                    </div>
                ))}
                <button onClick={OpenPopUp}>Add node</button>
                <button onClick={() => SetTreeRoot(nodes)}>Set default root</button>
            </div>

            <div id='tree'>
                <ReactFamilyTree
                    nodes={nodes}
                    rootId={root}
                    width={300}
                    height={300}
                    renderNode={(node) => (
                        <div
                            className='node'
                            onClick={() => EditNode(node.id)}
                            style={{ transform: `translate(${50 + node.left * 150}px, ${50 + node.top * 150}px)` }}
                        >

                            {node?.data?.name} {node?.data?.surname} {node?.data?.deathdate ? '✝' : ''}
                            <pre>
                                {node?.data?.birthdate + '\n'}
                                {node?.data?.deathdate}
                            </pre>
                        </div>
                    )}
                />
            </div>

            <PopUp
                nodeList={nodes}
                nodeToEdit={nodeToEdit}
                setNodeToEdit={(nodeID) => EditNode(nodeID)}
                clearNodeToEdit={() => setNodeToEdit(null)}
                addOrUpdNode={(nodeData) => AddOrUpdNode(nodeData)}
                deleteNode={(nodeID) => DeleteNode(nodeID)}
            />
        </div >
    );
}

export default App;