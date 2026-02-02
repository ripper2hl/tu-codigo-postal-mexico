# Patch to allow Liquid 4.x to run on Ruby 3.2+ (where tainted? was removed)
unless Object.new.respond_to?(:tainted?)
  class Object
    def tainted?
      false
    end
    def untaint
      self
    end
  end
end
