import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

function PopUp(props) {
    const currentSelect = useRef('')
    const [nodesToSelect, setNodesToSelect] = useState([])
    const [parents, setParents] = useState([])
    const [children, setChildren] = useState([])

    const ClosePopUp = () => {
        if (document.querySelector('input[name="gender"]:checked'))
            document.querySelector('input[name="gender"]:checked').checked = false
        document.querySelector('input[name="name"]').value = null
        document.querySelector('input[name="surname"]').value = null
        document.querySelector('input[name="birthdate"]').value = null
        document.querySelector('input[name="deathdate"]').value = null
        document.getElementById('popup').style.display = 'none';
        if (props.nodeToEdit)
            props.clearNodeToEdit()
        setParents([])
        setChildren([])
        CloseNodeList()
    }

    const SaveNode = async () => {
        CloseNodeList()
        let nodeData = {
            ID: props?.nodeToEdit?.data?.ID,
            gender: document.querySelector('input[name="gender"]:checked')?.value ?? '',
            name: document.querySelector('input[name="name"]').value,
            surname: document.querySelector('input[name="surname"]').value,
            birthdate: document.querySelector('input[name="birthdate"]').value,
            deathdate: document.querySelector('input[name="deathdate"]').value,
            children: children.map(child => child.ID),
            parents: parents.map(parent => parent.ID),
        }

        try {
            var request = axios.create({
                baseURL: 'http://localhost:8000/node',
                params: {
                    node: nodeData
                },
                headers: {}
            })
            var response = await request.post()
            props.addOrUpdNode({ node: response.data, children: children, parents: parents })
            ClosePopUp()
        } catch (error) {
            console.error('Error saving node: ', error)
            alert('Error saving node')
        }
    }

    const DeleteNode = async () => {
        CloseNodeList()
        try {
            var request = axios.create({
                baseURL: 'http://localhost:8000/node_delete',
                params: {
                    nodeID: props?.nodeToEdit?.data?.ID
                },
                headers: {}
            })
            await request.post()
            props.deleteNode(props?.nodeToEdit?.data?.ID)
            ClosePopUp()
        } catch (error) {
            console.error('Error deleting node: ', error)
            alert('Error deleting node')
        }
    }

    const UpdateValues = () => {
        let genderRadioButton = document.querySelector(`input[name="gender"][value="${props?.nodeToEdit?.data?.gender}"]`)
        if (genderRadioButton)
            genderRadioButton.checked = true
        document.querySelector('input[name="name"]').value = props?.nodeToEdit?.data?.name ?? ''
        document.querySelector('input[name="surname"]').value = props?.nodeToEdit?.data?.surname ?? ''
        document.querySelector('input[name="birthdate"]').value = props?.nodeToEdit?.data?.birthdate ?? ''
        document.querySelector('input[name="deathdate"]').value = props?.nodeToEdit?.data?.deathdate ?? ''
        if (props.nodeToEdit) {
            let parentsList = props.nodeList.filter(node => node.children.some(child => child.id == props.nodeToEdit.data.ID)).map(node => node.data)
            let childrenList = props.nodeList.filter(node => node.parents.some(parent => parent.id == props.nodeToEdit.data.ID)).map(node => node.data)
            setParents(parentsList)
            setChildren(childrenList)
        }
    }

    const OpenNodeList = (currentSelectValue) => {
        let nodes = props.nodeList
            .filter(node =>
                !parents.some(parent => parent.ID == node.data.ID) &&
                !children.some(child => child.ID == node.data.ID) &&
                node.data.ID != props?.nodeToEdit?.data?.ID
            ).map(node => node.data)

        setNodesToSelect(nodes)
        currentSelect.current = currentSelectValue

        let position = document.getElementById('form').getBoundingClientRect()
        let node_list = document.getElementById('node_list')
        node_list.style.top = `${position.y + 330}px`
        node_list.style.left = `${position.x - 200}px`
    }

    const CloseNodeList = () => {
        let node_list = document.getElementById('node_list')
        node_list.style.top = '-1000px'
        node_list.style.left = '-1000px'
    }

    const SelectNode = (nodeID) => {
        let node = props.nodeList.find(node => node.id == nodeID)
        if (currentSelect.current === 'parents')
            setParents([...parents, node.data])
        else if (currentSelect.current === 'children')
            setChildren([...children, node.data])
        CloseNodeList()
    }

    useEffect(() => {
        UpdateValues()
    }, [props.nodeToEdit, props.nodeList])

    return (
        <div id='popup'>
            <form id='form'>

                <div className='inputGroup'>
                    <label>Gender: </label>
                    <label htmlFor='gender_male'>Male</label>
                    <input type='radio' id='gender_male' name='gender' value='male' />
                    <label htmlFor='gender_female'>Female</label>
                    <input type='radio' id='gender_female' name='gender' value='female' />
                </div>

                <div className='inputGroup'>
                    <label htmlFor='name'>Name:</label>
                    <input type='text' id='name' name='name' />
                </div>

                <div className='inputGroup'>
                    <label htmlFor='surname'>Surname:</label>
                    <input type='text' id='surname' name='surname' />
                </div>

                <div className='inputGroup'>
                    <label htmlFor='birthdate'>Birthdate:</label>
                    <input type='date' id='birthdate' name='birthdate' />
                </div>

                <div className='inputGroup'>
                    <label htmlFor='deathdate'>Deathdate:</label>
                    <input type='date' id='deathdate' name='deathdate' />
                </div>

                <div>
                    <div id='node_list'>
                        <div id='close_node_list' onClick={CloseNodeList}>X</div>
                        {nodesToSelect.map(node => (
                            <div
                                className='node_select'
                                onClick={() => SelectNode(node.ID)}
                            >
                                {node?.name} {node?.surname}
                            </div>
                        ))}
                    </div>

                    <div id='parents_node_list'>
                        Parents
                        <button type='button' onClick={() => OpenNodeList('parents')}>Add parent</button>
                        {parents.map(node => (
                            <div>
                                <div
                                    className='node_link'
                                    onClick={() => { CloseNodeList(); props.setNodeToEdit(node.ID) }}
                                >
                                    {node?.name} {node?.surname}

                                </div>
                                <div className='delete_from_list' onClick={() => setParents(parents.filter(parent => parent.ID !== node.ID))}>X</div>
                            </div>
                        ))}
                    </div>

                    <div id='children_node_list'>
                        Children
                        <button type='button' onClick={() => OpenNodeList('children')}>Add child</button>
                        {children.map(node => (
                            <div>
                                <div
                                    className='node_link'
                                    onClick={() => { CloseNodeList(); props.setNodeToEdit(node.ID) }}
                                >
                                    {node?.name} {node?.surname}
                                </div>
                                <div className='delete_from_list' onClick={() => setChildren(children.filter(child => child.ID !== node.ID))}>X</div>
                            </div>
                        ))}
                    </div>
                </div>

                <button type='button' onClick={SaveNode}>{props.nodeToEdit ? 'Save node' : 'Add node'}</button>
                {props.nodeToEdit ? <button type='button' onClick={DeleteNode}>Delete node</button> : ''}
                <button type='button' onClick={ClosePopUp}>Close</button>
            </form>
        </div>
    )
}

export default PopUp;