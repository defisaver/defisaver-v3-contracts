// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

interface HintHelpers {

    // --- Events ---

    event SortedTrovesAddressChanged(address _sortedTrovesAddress);
    event TroveManagerAddressChanged(address _troveManagerAddress);

    function getRedemptionHints(
        uint _LUSDamount, 
        uint _price,
        uint _maxIterations
    )
        external
        view
        returns (
            address firstRedemptionHint,
            uint partialRedemptionHintNICR,
            uint truncatedLUSDamount
        );

    function getApproxHint(uint _CR, uint _numTrials, uint _inputRandomSeed)
        external
        view
        returns (address hintAddress, uint diff, uint latestRandomSeed);

    function computeNominalCR(uint _coll, uint _debt) external pure returns (uint);

    function computeCR(uint _coll, uint _debt, uint _price) external pure returns (uint);
}
