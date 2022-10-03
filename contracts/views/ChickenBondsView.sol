// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../utils/TokenUtils.sol";
import "../actions/liquity/helpers/LiquityHelper.sol";
import "../interfaces/liquity/IChickenBondManager.sol";
import "../interfaces/liquity/IBondNFT.sol";
import "../interfaces/liquity/IBondNFTArtwork.sol";

contract ChickenBondsView is LiquityHelper {

    struct BondDataFull {
        uint256 bondID; // ERC721 token id
        uint256 lusdAmount; // Lusd amount entered in the bond
        uint64 claimedBLUSD; // In BLUSD units without decimals
        uint256 accruedBLUSD; // Amount of blusd accrued when in active phase
        uint256 maxAmountBLUSD; // Max cap amount of blusd the bond can accrue
        uint64 startTime; // Timestamp when bond is created
        uint64 endTime; // Timestamp of chicken in/out event
        IChickenBondManager.BondStatus status; // [nonExistent = 0, active = 1, chickenedOut = 2, chickenedIn = 3]
        string tokenURI; // json data of token image
    }

    struct ChickenBondsSystemInfo {
        uint256 totalPendingLUSD;
        uint256 totalReserveLUSD;
        uint256 totalPermanentLUSD;
        uint256 ownedLUSDInSP; // protocolOwnedLusdInStabilityPool
        uint256 ownedLUSDInCurve; // protocolLusdInCurve
        uint256 systemBackingRatio;
        uint256 accrualParameter;
        uint256 chickenInAMMFee;
        uint256 numPendingBonds;
        uint256 numChickenInBonds;
        uint256 numChickenOutBonds;
        uint256 bLUSDSupply;
    }

    function getBondFullInfo(uint256 _bondID) public view returns (BondDataFull memory bond) {
        IBondNFT bondNFT = IBondNFT(BOND_NFT_ADDRESS);

        IChickenBondManager.BondData memory bondData = CBManager.getBondData(_bondID);
        IBondNFT.BondExtraData memory bondDataExtra = bondNFT.getBondExtraData(_bondID);

        string memory tokenUri = IBondNFTArtwork(BOND_NFT_ARTWORK_ADDRESS).tokenURI(_bondID, bondDataExtra);


        bond = BondDataFull({
            bondID: _bondID,
            lusdAmount: bondData.lusdAmount,
            claimedBLUSD: bondData.claimedBLUSD,
            accruedBLUSD: CBManager.calcAccruedBLUSD(_bondID),
            maxAmountBLUSD: CBManager.calcBondBLUSDCap(_bondID),
            startTime: bondData.startTime,
            endTime: bondData.endTime,
            status: bondData.status,
            tokenURI: tokenUri
        });
    }

    function getUsersBonds(address _userAddr) public view returns (BondDataFull[] memory bonds) {
        IBondNFT bondNFT = IBondNFT(BOND_NFT_ADDRESS);

        uint numTokens = bondNFT.balanceOf(_userAddr);
        bonds = new BondDataFull[](numTokens);

        for (uint256 i = 0; i < numTokens; ++i) {
            uint256 bondID = bondNFT.tokenOfOwnerByIndex(_userAddr, i);

            bonds[i] = getBondFullInfo(bondID);
        }
    }

    function getSystemInfo() public view returns (ChickenBondsSystemInfo memory systemInfo) {
        (uint256 totalPendingLUSD, uint256 totalReserveLUSD, uint256 totalPermanentLUSD) = CBManager.getTreasury();

        systemInfo = ChickenBondsSystemInfo({
            totalPendingLUSD: totalPendingLUSD,
            totalReserveLUSD: totalReserveLUSD,
            totalPermanentLUSD: totalPermanentLUSD,
            ownedLUSDInSP: CBManager.getOwnedLUSDInSP(),
            ownedLUSDInCurve: CBManager.getOwnedLUSDInCurve(),
            systemBackingRatio: CBManager.calcSystemBackingRatio(),
            accrualParameter: CBManager.calcUpdatedAccrualParameter(),
            chickenInAMMFee: CBManager.CHICKEN_IN_AMM_FEE(),
            numPendingBonds: CBManager.getOpenBondCount(),
            numChickenInBonds: CBManager.countChickenIn(),
            numChickenOutBonds: CBManager.countChickenOut(),
            bLUSDSupply: IERC20(BLUSD_ADDRESS).totalSupply()
        });
    }
}