pragma solidity 0.8.0;

import "../ownership/ownable.sol";
import "./erc721.sol";
import "../security/reentrancy-guard.sol";
import "../utils/counter-utils.sol";
import "../utils/timer-utils.sol";

contract NftMarket is ReentrancyGuard
{
  /**
   * @dev List of revert message codes. Implementing dApp should handle showing the correct message.
   * Based on 0xcert framework error codes.
   */
  string constant NOT_VALID_MIN_PRICE = "004001";
  string constant NOT_VALID_ASK_PRICE = "004002";
  string constant NOT_VALID_BID_PRICE = "004003";
  string constant NOT_VALID_DEADLINE_FOR_SELL = "004004";
  string constant MARKET_ITEM_EXPIRED = "004005";
  string constant ACCESS_DENIED = "004006";
  string constant ALREADY_SOLD = "004007";

  using CounterUtils for CounterUtils.Counter;
  using TimerUtils for TimerUtils.Timestamp;

  CounterUtils.Counter private _itemIds;
  CounterUtils.Counter private _itemsSold;

  address payable owner;
  uint256 listingPrice = 0.025 ether;

  constructor() {
    owner = payable(msg.sender);
  }

  struct MarketItem {
    uint itemId;
    address nftContract;
    uint256 tokenId;
    address payable seller;
    address payable owner;
    uint256 price;
    bool sold;
    TimerUtils.Timestamp deadlineForSell;
  }

  mapping(uint256 => MarketItem) private idToMarketItem;

  event MarketItemCreated (
    uint indexed itemId,
    address indexed nftContract,
    uint256 indexed tokenId,
    address seller,
    address owner,
    uint256 price,
    bool sold,
    TimerUtils.Timestamp deadlineForSell
  );

  event MarketItemDeleted (
    uint indexed itemId,
    address indexed nftContract,
    uint256 indexed tokenId,
    address seller,
    uint256 price
  );

  /* Returns the listing price of the contract */
  function getListingPrice() public view returns (uint256) {
    return listingPrice;
  }

  /* Places an item for sale on the marketplace */
  function createMarketItem(
    address nftContract,
    uint256 tokenId,
    uint256 price,
    uint64 deadlineForSell
  ) public payable nonReentrant {
    require(price > 0, NOT_VALID_MIN_PRICE);
    require(msg.value == listingPrice, NOT_VALID_ASK_PRICE);

    TimerUtils.Timestamp memory deadline = TimerUtils.Timestamp({_deadline : deadlineForSell});
    require(!deadline.isExpired(), NOT_VALID_DEADLINE_FOR_SELL);

    _itemIds.increment();
    uint256 itemId = _itemIds.current();

    idToMarketItem[itemId] = MarketItem(
      itemId,
      nftContract,
      tokenId,
      payable(msg.sender),
      payable(address(0)),
      price,
      false,
      deadline
    );

    ERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

    emit MarketItemCreated(
      itemId,
      nftContract,
      tokenId,
      msg.sender,
      address(0),
      price,
      false,
      deadline
    );
  }

  /* Delete own market item by id */
  function deleteMarketItem(uint itemId) public payable nonReentrant {
    MarketItem memory marketItem = idToMarketItem[itemId];

    require(marketItem.seller == msg.sender, ACCESS_DENIED);
    require(!marketItem.sold, ALREADY_SOLD);

    ERC721(marketItem.nftContract).transferFrom(address(this), msg.sender, marketItem.tokenId);
    delete idToMarketItem[itemId];

    emit MarketItemDeleted(
      itemId,
      marketItem.nftContract,
      marketItem.tokenId,
      msg.sender,
      price
    );
  }

  /* Creates the sale of a marketplace item */
  /* Transfers ownership of the item, as well as funds between parties */
  function createMarketSale(
    address nftContract,
    uint256 itemId
  ) public payable nonReentrant {
    MarketItem memory marketItem = idToMarketItem[itemId];

    TimerUtils.Timestamp memory deadlineForSell = marketItem.deadlineForSell;
    require(!deadlineForSell.isExpired(), MARKET_ITEM_EXPIRED);

    uint price = marketItem.price;
    require(msg.value == price, NOT_VALID_BID_PRICE);

    uint tokenId = marketItem.tokenId;

    idToMarketItem[itemId].seller.transfer(msg.value);
    ERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);
    idToMarketItem[itemId].owner = payable(msg.sender);
    idToMarketItem[itemId].sold = true;
    _itemsSold.increment();
    payable(owner).transfer(listingPrice);
  }

  /* Returns all unsold market items */
  function fetchMarketItems() public view returns (MarketItem[] memory) {
    uint itemCount = _itemIds.current();
    uint unsoldItemCount = _itemIds.current() - _itemsSold.current();
    uint currentIndex = 0;

    MarketItem[] memory items = new MarketItem[](unsoldItemCount);
    for (uint i = 0; i < itemCount; i++) {
      if (idToMarketItem[i + 1].owner == address(0)) {
        uint currentId = i + 1;
        MarketItem storage currentItem = idToMarketItem[currentId];
        items[currentIndex] = currentItem;
        currentIndex += 1;
      }
    }
    return items;
  }

  /* Returns only items that a user has purchased */
  function fetchMyNFTs() public view returns (MarketItem[] memory) {
    uint totalItemCount = _itemIds.current();
    uint itemCount = 0;
    uint currentIndex = 0;

    for (uint i = 0; i < totalItemCount; i++) {
      if (idToMarketItem[i + 1].owner == msg.sender) {
        itemCount += 1;
      }
    }

    MarketItem[] memory items = new MarketItem[](itemCount);
    for (uint i = 0; i < totalItemCount; i++) {
      if (idToMarketItem[i + 1].owner == msg.sender) {
        uint currentId = i + 1;
        MarketItem storage currentItem = idToMarketItem[currentId];
        items[currentIndex] = currentItem;
        currentIndex += 1;
      }
    }
    return items;
  }

  /* Returns only items a user has created */
  function fetchItemsCreated() public view returns (MarketItem[] memory) {
    uint totalItemCount = _itemIds.current();
    uint itemCount = 0;
    uint currentIndex = 0;

    for (uint i = 0; i < totalItemCount; i++) {
      if (idToMarketItem[i + 1].seller == msg.sender) {
        itemCount += 1;
      }
    }

    MarketItem[] memory items = new MarketItem[](itemCount);
    for (uint i = 0; i < totalItemCount; i++) {
      if (idToMarketItem[i + 1].seller == msg.sender) {
        uint currentId = i + 1;
        MarketItem storage currentItem = idToMarketItem[currentId];
        items[currentIndex] = currentItem;
        currentIndex += 1;
      }
    }
    return items;
  }

  /* Returns only items a user has created but item already expired */
  function fetchItemsCreatedAndExpired() public view returns (MarketItem[] memory) {
    uint totalItemCount = _itemIds.current();
    uint itemCount = 0;
    uint currentIndex = 0;

    for (uint i = 0; i < totalItemCount; i++) {
      if (idToMarketItem[i + 1].seller == msg.sender && idToMarketItem[i + 1].deadlineForSell.isExpired()) {
        itemCount += 1;
      }
    }

    MarketItem[] memory items = new MarketItem[](itemCount);
    for (uint i = 0; i < totalItemCount; i++) {
      if (idToMarketItem[i + 1].seller == msg.sender && idToMarketItem[i + 1].deadlineForSell.isExpired()) {
        uint currentId = i + 1;
        MarketItem storage currentItem = idToMarketItem[currentId];
        items[currentIndex] = currentItem;
        currentIndex += 1;
      }
    }
    return items;
  }
}
