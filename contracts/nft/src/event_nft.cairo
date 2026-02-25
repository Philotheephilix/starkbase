use starknet::ContractAddress;

#[starknet::interface]
pub trait IEventNFT<T> {
    fn mint(ref self: T, recipient: ContractAddress) -> u256;
    fn get_event_metadata(self: @T) -> (ByteArray, ByteArray, ByteArray, u256, ContractAddress);
    fn get_token_recipient(self: @T, token_id: u256) -> ContractAddress;
}

#[starknet::contract]
pub mod EventNFT {
    use contracts::components::counter::CounterComponent;
    use openzeppelin_access::ownable::OwnableComponent;
    use openzeppelin_introspection::src5::SRC5Component;
    use openzeppelin_token::erc721::ERC721Component;
    use openzeppelin_token::erc721::extensions::ERC721EnumerableComponent;
    use openzeppelin_token::erc721::extensions::ERC721EnumerableComponent::InternalTrait as EnumerableInternalTrait;
    use openzeppelin_token::erc721::interface::IERC721Metadata;
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};
    use super::{ContractAddress, IEventNFT};

    component!(path: ERC721Component, storage: erc721, event: ERC721Event);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: CounterComponent, storage: token_id_counter, event: CounterEvent);
    component!(path: ERC721EnumerableComponent, storage: enumerable, event: EnumerableEvent);

    #[abi(embed_v0)]
    impl OwnableImpl = OwnableComponent::OwnableImpl<ContractState>;
    impl CounterImpl = CounterComponent::CounterImpl<ContractState>;
    #[abi(embed_v0)]
    impl ERC721Impl = ERC721Component::ERC721Impl<ContractState>;
    #[abi(embed_v0)]
    impl SRC5Impl = SRC5Component::SRC5Impl<ContractState>;
    #[abi(embed_v0)]
    impl ERC721EnumerableImpl =
        ERC721EnumerableComponent::ERC721EnumerableImpl<ContractState>;

    impl ERC721InternalImpl = ERC721Component::InternalImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[storage]
    pub struct Storage {
        #[substorage(v0)]
        pub erc721: ERC721Component::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        token_id_counter: CounterComponent::Storage,
        #[substorage(v0)]
        pub enumerable: ERC721EnumerableComponent::Storage,
        // Per-token URI storage (recipient address hex)
        token_uris: Map<u256, ByteArray>,
        // Event-specific metadata (immutable after deploy)
        event_description: ByteArray,
        image_url: ByteArray,
        max_supply: u256,
        platform_creator: ContractAddress,
        // Token → original recipient mapping
        token_recipient: Map<u256, ContractAddress>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC721Event: ERC721Component::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        CounterEvent: CounterComponent::Event,
        EnumerableEvent: ERC721EnumerableComponent::Event,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        event_name: ByteArray,
        event_symbol: ByteArray,
        event_description: ByteArray,
        image_url: ByteArray,
        max_supply: u256,
        base_uri: ByteArray,
        owner: ContractAddress,
        platform_creator: ContractAddress,
    ) {
        self.erc721.initializer(event_name, event_symbol, base_uri);
        self.enumerable.initializer();
        self.ownable.initializer(owner);
        self.event_description.write(event_description);
        self.image_url.write(image_url);
        self.max_supply.write(max_supply);
        self.platform_creator.write(platform_creator);
    }

    #[abi(embed_v0)]
    pub impl EventNFTImpl of IEventNFT<ContractState> {
        fn mint(ref self: ContractState, recipient: ContractAddress) -> u256 {
            self.ownable.assert_only_owner();
            let max = self.max_supply.read();
            if max != 0 {
                let minted = self.token_id_counter.current();
                assert(minted < max, 'Max supply reached');
            }
            self.token_id_counter.increment();
            let token_id = self.token_id_counter.current();
            self.erc721.mint(recipient, token_id);
            // Store recipient address (as felt252 hex) as the per-token URI
            let recipient_felt: felt252 = recipient.into();
            let uri: ByteArray = format!("0x{:x}", recipient_felt);
            self.set_token_uri(token_id, uri);
            self.token_recipient.write(token_id, recipient);
            token_id
        }

        fn get_event_metadata(
            self: @ContractState
        ) -> (ByteArray, ByteArray, ByteArray, u256, ContractAddress) {
            (
                self.erc721.name(),
                self.event_description.read(),
                self.image_url.read(),
                self.max_supply.read(),
                self.platform_creator.read(),
            )
        }

        fn get_token_recipient(self: @ContractState, token_id: u256) -> ContractAddress {
            self.token_recipient.read(token_id)
        }
    }

    #[abi(embed_v0)]
    pub impl WrappedIERC721MetadataImpl of IERC721Metadata<ContractState> {
        fn token_uri(self: @ContractState, token_id: u256) -> ByteArray {
            self._token_uri(token_id)
        }
        fn name(self: @ContractState) -> ByteArray { self.erc721.name() }
        fn symbol(self: @ContractState) -> ByteArray { self.erc721.symbol() }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _token_uri(self: @ContractState, token_id: u256) -> ByteArray {
            assert(self.erc721.exists(token_id), ERC721Component::Errors::INVALID_TOKEN_ID);
            let base_uri = self.erc721._base_uri();
            if base_uri.len() == 0 {
                Default::default()
            } else {
                let uri = self.token_uris.read(token_id);
                format!("{}{}", base_uri, uri)
            }
        }
        fn set_token_uri(ref self: ContractState, token_id: u256, uri: ByteArray) {
            assert(self.erc721.exists(token_id), ERC721Component::Errors::INVALID_TOKEN_ID);
            self.token_uris.write(token_id, uri);
        }
    }

    impl ERC721HooksImpl of ERC721Component::ERC721HooksTrait<ContractState> {
        fn before_update(
            ref self: ERC721Component::ComponentState<ContractState>,
            to: ContractAddress,
            token_id: u256,
            auth: ContractAddress,
        ) {
            let mut contract_state = self.get_contract_mut();
            contract_state.enumerable.before_update(to, token_id);
        }
    }
}
