const { v4: guid } = require('uuid')
const express = require('express')
const app = express()

require('dotenv').config()
const neo4j = require('neo4j-driver')
const driver = neo4j.driver(
    process.env.DB_URL,
    neo4j.auth.basic(process.env.DB_USERNAME, process.env.DB_PASSWORD)
)

//NODES
app.get('/node', async function (req, res) {
    const session = driver.session()
    try {
        const result = await session.run('MATCH (p:Person) RETURN p')
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000')
        res.send(result.records.map((record) => record.get('p').properties))
    }
    catch (error) {
        console.error(error)
        res.status(500).send({ error: error })
    }
    finally {
        await session.close()
    }
})

app.post('/node', async function (req, res) {
    const session = driver.session()
    const transaction = await session.beginTransaction()
    try {
        let nodeData = req.query.node
        if (nodeData.ID)
            var query = 'MATCH (p:Person {ID: $id}) SET p.gender = $gender, p.name = $name, p.surname = $surname, p.birthdate = $birthdate, p.deathdate = $deathdate RETURN p'
        else {
            var query = 'CREATE (p:Person {ID: $id, gender: $gender, name: $name, surname: $surname, birthdate: $birthdate, deathdate: $deathdate}) RETURN p'
            nodeData.ID = guid()
        }

        const result = await transaction.run(query,
            {
                id: nodeData.ID,
                gender: nodeData.gender,
                name: nodeData.name,
                surname: nodeData.surname,
                birthdate: nodeData.birthdate,
                deathdate: nodeData.deathdate
            }
        )
        let node = result.records[0].get('p').properties
        await UpdateRelations(transaction, { nodeID: node.ID, children: nodeData.children ?? [], parents: nodeData.parents ?? [] })

        await transaction.commit()
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000')
        res.send(node)
    }
    catch (error) {
        await transaction.rollback()
        console.error(error)
        res.status(500).send({ error: error })
    }
    finally {
        await transaction.close()
        await session.close()
    }
})

app.post('/node_delete', async function (req, res) {
    const session = driver.session()
    const transaction = await session.beginTransaction()
    try {
        let nodeID = req.query.nodeID
        await transaction.run('MATCH (p:Person {ID: $id}) DETACH DELETE p', { id: nodeID })
        await UpdateRelations(transaction, { nodeID: nodeID, children: [], parents: [] })

        await transaction.commit()
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000')
        res.send('OK')
    }
    catch (error) {
        await transaction.rollback()
        console.error(error)
        res.status(500).send({ error: error })
    }
    finally {
        await transaction.close()
        await session.close()
    }
})

//EDGES
app.get('/relation', async function (req, res) {
    try {
        const result = await GetRelations()
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000')
        res.send(result)
    }
    catch (error) {
        console.error(error)
        res.status(500).send({ error: error })
    }
})

const GetRelations = async () => {
    const session = driver.session()
    try {
        const result = await session.run('MATCH (parent)-[:PARENT_OF]->(child) RETURN parent, child')
        return result.records.map(record => ({
            parentID: record.get('parent').properties.ID,
            childID: record.get('child').properties.ID,
        }))
    }
    finally {
        await session.close()
    }
}

const UpdateRelations = async (transaction, data) => {
    let currentRelations = await GetRelations()
    let currentChildren = currentRelations.filter(relation => relation.parentID == data.nodeID).map(relation => relation.childID)
    let newChildren = data.children

    let currentParents = currentRelations.filter(relation => relation.childID == data.nodeID).map(relation => relation.parentID)
    let newParents = data.parents

    //Delete
    let relationsToDelete = []
    relationsToDelete = relationsToDelete.concat(currentChildren
        .filter(currChildID => !newChildren.some(newChildID => newChildID == currChildID))
        .map(currChildID => ({ parentID: data.nodeID, childID: currChildID }))
    )
    relationsToDelete = relationsToDelete.concat(currentParents
        .filter(currParentID => !newParents.some(newParentID => newParentID == currParentID))
        .map(currParentID => ({ parentID: currParentID, childID: data.nodeID }))
    )
    relationsToDelete.forEach(async relation =>
        await DeleteRelation(transaction, relation)
    )

    //Add
    let relationsToAdd = []
    relationsToAdd = relationsToAdd.concat(newChildren
        .filter(newChildID => !currentChildren.some(currChildID => currChildID == newChildID))
        .map(newChildID => ({ parentID: data.nodeID, childID: newChildID }))
    )
    relationsToAdd = relationsToAdd.concat(newParents
        .filter(newParentID => !currentParents.some(currParentID => currParentID == newParentID))
        .map(newParentID => ({ parentID: newParentID, childID: data.nodeID }))
    )
    relationsToAdd.forEach(async relation =>
        await AddRelation(transaction, relation)
    )
}

const AddRelation = async (transaction, data) => {
    const result = await transaction.run(
        'MATCH (parent:Person {ID: $parentID}), (child:Person {ID: $childID}) CREATE (parent)-[:PARENT_OF]->(child)',
        { parentID: data.parentID, childID: data.childID }
    )
}

const DeleteRelation = async (transaction, data) => {
    await transaction.run(
        'MATCH (parent:Person {ID: $parentID})-[rel:PARENT_OF]->(child:Person {ID: $childID}) DELETE rel',
        { parentID: data.parentID, childID: data.childID }
    )
}

app.listen("8000", function () {
    console.log('listening on 8000')
})