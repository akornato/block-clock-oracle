import { expect } from "chai";
import { ethers } from "hardhat";
import type { Signer } from "ethers";
import { OracleDaily } from "../typechain";

describe("OracleDaily", function () {
  let oracleDaily: OracleDaily;
  let signers: Signer[];

  before(async function () {
    const OracleDaily = await ethers.getContractFactory("OracleDaily");
    oracleDaily = await OracleDaily.deploy();
    await oracleDaily.deployed();
    signers = await ethers.getSigners();
  });

  it("Should add a daily mapping", async function () {
    expect(await oracleDaily.dailyBlockCount("2021-10-15")).to.equal(0);
    expect(await oracleDaily.dailyGasFees("2021-10-15")).to.equal(0);

    const tx = await oracleDaily
      .connect(signers[0])
      .addDaily("2021-10-15", 15, 150);
    await tx.wait();

    expect(await oracleDaily.dailyBlockCount("2021-10-15")).to.equal(15);
    expect(await oracleDaily.dailyGasFees("2021-10-15")).to.equal(150);
  });
});
