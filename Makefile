.PHONY: all frontend build release clean

BINARY_NAME=neuron
OUT_DIR=dist

all: build

frontend:
	@echo "==> Syncing root-level Markdown Docs..."
	mkdir -p frontend/src/docs && cp docs/*.md frontend/src/docs/
	@echo "==> Building Next.js Frontend..."
	cd frontend && npm install && npm run build

build: frontend
	@echo "==> Building Local Go Binary..."
	go build -o $(BINARY_NAME) cmd/neuron/main.go
	@echo "==> Done! Run ./$(BINARY_NAME) to launch Neuron HUD."

release: frontend
	@echo "==> Cross-compiling for macOS, Linux, and Windows..."
	mkdir -p $(OUT_DIR)
	
	# macOS (Apple Silicon & Intel)
	GOOS=darwin GOARCH=arm64 go build -o $(OUT_DIR)/$(BINARY_NAME)-darwin-arm64 cmd/neuron/main.go
	GOOS=darwin GOARCH=amd64 go build -o $(OUT_DIR)/$(BINARY_NAME)-darwin-amd64 cmd/neuron/main.go
	
	# Linux (amd64 & arm64)
	GOOS=linux GOARCH=amd64 go build -o $(OUT_DIR)/$(BINARY_NAME)-linux-amd64 cmd/neuron/main.go
	GOOS=linux GOARCH=arm64 go build -o $(OUT_DIR)/$(BINARY_NAME)-linux-arm64 cmd/neuron/main.go
	
	# Windows (amd64)
	GOOS=windows GOARCH=amd64 go build -o $(OUT_DIR)/$(BINARY_NAME)-windows-amd64.exe cmd/neuron/main.go

	@echo "==> Packaging release archives..."
	tar -czf $(OUT_DIR)/$(BINARY_NAME)-darwin-arm64.tar.gz -C $(OUT_DIR) $(BINARY_NAME)-darwin-arm64
	tar -czf $(OUT_DIR)/$(BINARY_NAME)-darwin-amd64.tar.gz -C $(OUT_DIR) $(BINARY_NAME)-darwin-amd64
	tar -czf $(OUT_DIR)/$(BINARY_NAME)-linux-amd64.tar.gz -C $(OUT_DIR) $(BINARY_NAME)-linux-amd64
	tar -czf $(OUT_DIR)/$(BINARY_NAME)-linux-arm64.tar.gz -C $(OUT_DIR) $(BINARY_NAME)-linux-arm64
	zip -q -j $(OUT_DIR)/$(BINARY_NAME)-windows-amd64.zip $(OUT_DIR)/$(BINARY_NAME)-windows-amd64.exe

	@echo "==> Cross-compilation and packaging complete in /$(OUT_DIR) directory!"

clean:
	@echo "==> Cleaning build artifacts..."
	rm -rf $(BINARY_NAME) $(OUT_DIR)
	rm -rf internal/web/frontend/out
