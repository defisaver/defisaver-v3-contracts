// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

import "../../../interfaces/liquity/ITroveManager.sol";
import "../../../interfaces/liquity/IBorrowerOperations.sol";
import "../../../interfaces/liquity/IPriceFeed.sol";
import "../../../interfaces/liquity/IHintHelpers.sol";
import "../../../interfaces/liquity/ISortedTroves.sol";

contract LiquityHelper {
    address constant public LUSDTokenAddr = 0x5f98805A4E8be255a32880FDeC7F6728C6568bA0;
    address constant public PriceFeedAddr = 0x4c517D4e2C851CA76d7eC94B805269Df0f2201De;
    address constant public BorrowerOperationsAddr = 0x24179CD81c9e782A4096035f7eC97fB8B783e007;
    address constant public TroveManagerAddr = 0xA39739EF8b0231DbFA0DcdA07d7e29faAbCf4bb2;
    address constant public SortedTrovesAddr = 0x8FdD3fbFEb32b28fb73555518f8b361bCeA741A6;
    address constant public HintHelpersAddr = 0xE84251b93D9524E0d2e621Ba7dc7cb3579F997C0;

    IPriceFeed constant public PriceFeed = IPriceFeed(PriceFeedAddr);
    IBorrowerOperations constant public BorrowerOperations = IBorrowerOperations(BorrowerOperationsAddr);
    ITroveManager constant public TroveManager = ITroveManager(TroveManagerAddr);
    ISortedTroves constant public SortedTroves = ISortedTroves(SortedTrovesAddr);
    IHintHelpers constant public HintHelpers = IHintHelpers(HintHelpersAddr);
}