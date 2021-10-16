// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import moment from "moment";
const EthDater = require("ethereum-block-by-date");
const { CONTRACT_ADDRESS } = process.env;

const dater = new EthDater(
  ethers.provider // Ethers provider, required.
);

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const yesterday = moment().subtract(1, "days");

  const { block: start } = await dater.getDate(
    yesterday.startOf("day"),
    true // Block after, optional. Search for the nearest block before or after the given date. By default true.
  );
  const firstBlockNumber = parseInt(start);
  const { block: end } = await dater.getDate(
    yesterday.endOf("day"),
    false // Block after, optional. Search for the nearest block before or after the given date. By default true.
  );
  const lastBlockNumber = parseInt(end);

  console.log(
    `Processing blocks from ${firstBlockNumber} to ${lastBlockNumber}`
  );

  let totalGasFees = BigNumber.from(0);
  for (
    let blockNumber = firstBlockNumber;
    blockNumber <= lastBlockNumber;
    blockNumber++
  ) {
    console.log(`Processing block number: ${blockNumber}`);
    const blockWithTransactions =
      await ethers.provider.getBlockWithTransactions(blockNumber);
    let blockGasFees = BigNumber.from(0);
    for (const transaction of blockWithTransactions.transactions) {
      const { gasPrice } = transaction;
      try {
        const gasUsed = (await transaction.wait()).gasUsed;
        blockGasFees = blockGasFees.add(
          gasUsed.mul(gasPrice || BigNumber.from(0))
        );
      } catch (e) {}
    }
    console.log("Block fees:", ethers.utils.formatEther(blockGasFees));
    totalGasFees = totalGasFees.add(blockGasFees);
    console.log("Total fees:", ethers.utils.formatEther(totalGasFees));
  }

  console.log(`Connecting to OracleDaily at ${CONTRACT_ADDRESS}`);
  const OracleDaily = await ethers.getContractAt(
    "OracleDaily",
    CONTRACT_ADDRESS || ""
  );
  const tx = await OracleDaily.addDaily(
    yesterday.format("YYYYMMDD"),
    lastBlockNumber - firstBlockNumber,
    totalGasFees
  );
  await tx.wait();
  console.log(`OracleDaily.addDaily transaction hash: ${tx.hash}`);
  console.log(
    `OracleDaily.dailyBlockCount: ${(
      await OracleDaily.dailyBlockCount(yesterday.format("YYYYMMDD"))
    ).toString()}`
  );
  console.log(
    `OracleDaily.dailyGasFees: ${(
      await OracleDaily.dailyGasFees(yesterday.format("YYYYMMDD"))
    ).toString()}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
