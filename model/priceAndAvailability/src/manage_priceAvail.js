const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { customAlphabet } = require("nanoid");
const alphabet = "0123456789";
const idSize = 16;
const nanoid = customAlphabet(alphabet, idSize);
/**************************************************************
 * Main Handler
 **************************************************************/
exports.handler = async function (event, context, callback) {
  if (!event) throw new Error("Event not found");
  let response;
  console.log("Received event {}", JSON.stringify(event, 3));
  try {
    switch (event.field) {
      case "createPriceAndAvailability":
        response = await createPriceAndAvailability(event.body, event.identity);
        break;
      case "updatePriceAndAvailability":
        response = await updatePriceAndAvailability(event.body, event.identity);
        break;
      case "deletePriceAndAvailability":
        response = await deletePriceAndAvailability(event.body, event.identity);
        break;
    }
  } catch (e) {
    console.error("Error Occured", e);
  }
  return response;
};
/**************************************************************
 * Create Product
 **************************************************************/
createPriceAndAvailability = async (body, identity) => {
  const id = nanoid();
  const userName = identity;
  body.input["id"] = id;
  body.input["createdAt"] = new Date().toISOString();
  body.input["createdBy"] = identity.userName;
  const params = {
    TableName: process.env.TABLE_NAME,
    Item: body.input,
  };

  try {
    // Create the item
    await dynamodb.put(params).promise();

    return {
      ...body.input,
      message: "Item successfully Inserted",
    };
  } catch (err) {
    console.log("Error: ", err);
  }
};

/**************************************************************
 * Update Record
 **************************************************************/
updatePriceAndAvailability = async (body, identity) => {
  const { id } = body.input;
  const newBody = { ...body.input };
  delete newBody.id;
  newBody.input["updatedAt"] = new Date().toISOString();
  newBody.input["updatedBy"] = identity.userName;

  let TestUpdateExpression = "";
  let ExpressionAttributeValues = {};
  let i = 0;

  for (let item in newBody) {
    if (i === 0) {
      TestUpdateExpression += `set ${item} = :new${item}, `;
      i++;
    } else TestUpdateExpression += `${item} = :new${item}, `;

    ExpressionAttributeValues[`:new${item}`] = newBody[item];
  }

  const UpdateExpression = TestUpdateExpression.slice(0, -2);

  const params = {
    TableName: process.env.TABLE_NAME,
    Key: {
      id,
    },
    UpdateExpression,
    ExpressionAttributeValues,
    ReturnValues: "UPDATED_NEW",
  };

  try {
    const res = await dynamodb.update(params).promise();
    console.log(res);
    return {
      id,
      ...res.Attributes,
    };
  } catch (err) {
    console.log("ERROR: ", err);
    throw err;
  }
};

/**************************************************************
 * Delete Product
 **************************************************************/
deletePriceAndAvailability = async (body, identity) => {
  const params = {
    TableName: process.env.TABLE_NAME,
    Key: {
      id: body.input.id,
    },
  };

  try {
    await dynamodb.delete(params).promise();
    return {
      ...body.input,
      message: "Item successfully deleted",
    };
  } catch (err) {
    console.log("ERROR: ", err);
    throw err;
  }
};
