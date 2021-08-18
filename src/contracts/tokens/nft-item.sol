pragma solidity 0.8.0;

import "./nf-token-metadata.sol";
import "../ownership/ownable.sol";
import "../utils/counter-utils.sol";

/**
 * @dev This is an example contract implementation of NFToken with metadata extension.
 */
contract NftItem is
NFTokenMetadata,
Ownable
{
  using CounterUtils for CounterUtils.Counter;
  CounterUtils.Counter private _tokenIds;

  address marketContractAddress;

  /**
   * @dev Contract constructor. Sets metadata extension `name` and `symbol`.
   */
  constructor (
    string memory _name,
    string memory _symbol,
    address _marketContractAddress
  )
  {
    nftName = _name;
    nftSymbol = _symbol;
    marketContractAddress = _marketContractAddress;
  }

  /**
   * @dev Mints a new NFT.
   * @param tokenURI String representing RFC 3986 URI.
   */
  function createToken(string memory tokenURI)
  public
  onlyOwner
  returns (uint)
  {
    _tokenIds.increment();
    uint256 newItemId = _tokenIds.current();

    super._mint(msg.sender, newItemId);
    super._setTokenUri(newItemId, tokenURI);

    setApprovalForAll(marketContractAddress, true);

    return newItemId;
  }

}