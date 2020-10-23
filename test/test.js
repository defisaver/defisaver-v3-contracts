const { expect } = require("chai");

describe("Test", function() {
  it("Should call the Test contracts test method", async function() {
    const Test = await ethers.getContractFactory("Test");
    const test = await Test.deploy();
    
    await test.deployed();
    const tx = await test.test();
    console.log(tx);

  });
});